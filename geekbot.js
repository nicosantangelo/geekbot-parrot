const faker = require('faker')
const chalk = require('chalk')
const arg = require('arg')
const chrono = require('chrono-node')
const Slack = require('./Slack')
const githubActivity = require('./githubActivity')
const utils = require('./utils')

const SLACK_TOKEN = utils.envGet('SLACK_TOKEN', '') // https://api.slack.com/custom-integrations/legacy-tokens

async function main() {
  let args = {}

  try {
    args = arg({
      '--user': String,
      '--answer': String,
      '--from': String,
      '--help': Boolean
    })
  } catch (error) {
    // Ignore unknown flag error
  }
  args = Object.assign({ '--answer': 'log', '--time': 'yesterday' }, args)

  if (!SLACK_TOKEN || !args['--user'] || args['--help']) {
    console.log(`${chalk.bold.white('ENV variables')}:
  SLACK_TOKEN   You can get it from https://api.slack.com/custom-integrations/legacy-tokens

${chalk.bold.white('Flags')}:
  --user    Github username. Required
  --answer  Stays open watching for new geekbot chats. Options:
              - respond: Try to answer the current geekbot flow
              - watch: Works as 'respond' but stays open watching for new messages
              - log: pipe result to stdout
            Defaults to 'log'
  --from    Timeframe to look for Github activity. Defaults to yesterday (for each run). It supports natural language via https://github.com/wanasit/chrono
  --help    Print this help
`)
    return process.exit()
  }

  await run(args)
}

async function run(args) {
  const activities = await getActivities(args['--user'], args['--from'])
  if (activities.length === 0) {
    return console.log('No Github activity, you couch potato')
  }

  switch (args['--answer']) {
    case 'respond':
    case 'watch': {
      const slack = new Slack(SLACK_TOKEN)
      const geekbotId = await slack.getUserId({
        username: 'geekbot',
        isBot: true
      })

      const channelId = await slack.getUserDMChannelId({ userId: geekbotId })
      const channelHistory = await slack.getChannelHistory({
        channel: channelId,
        count: 1,
        unreads: true
      })
      const lastMessage = channelHistory[0]
      const exitOnEnd = args['--answer'] === 'respond'

      await answerGeekbot(lastMessage.text)

      slack.onUserMessage(geekbotId, message => answerGeekbot(message.text))

      async function answerGeekbot(message) {
        if (message.search('How do you feel today?') !== -1) {
          await slack.postMessage(geekbotId, getHowDoYouFeel())
        } else if (message.search('What did you do yesterday?') !== -1) {
          await slack.postMessage(geekbotId, getWhatDidYouDo(activities))
        } else if (message.search('What will you do today?') !== -1) {
          await slack.postMessage(geekbotId, getWhatWillYouDo(activities))
        } else if (message.search('Anything blocking your progress?') !== -1) {
          await slack.postMessage(geekbotId, getBlocking())
          if (exitOnEnd) process.exit()
        } else {
          console.log(`Don't know how to answer to ${message}`)
          if (exitOnEnd) process.exit()
        }
      }
      break
    }
    case 'log':
    default: {
      // prettier-ignore
      console.log(`${chalk.bold.white('How do you feel today?')}
  ${getHowDoYouFeel()}
${chalk.bold.white('What did you do yesterday?')}
  ${getWhatDidYouDo(activities, '\n  ')}
${chalk.bold.white('What will you do today?')}
  ${getWhatWillYouDo(activities)}
${chalk.bold.white('Anything blocking your progress?')}
  ${getBlocking()}`)
      break
    }
  }
}

async function getActivities(username, beforeDateText = 'today') {
  const beforeDate = chrono.parseDate(beforeDateText, new Date())
  const Slack = require('./slack')

  return await githubActivity.filter(username, beforeDate)
}

function getHowDoYouFeel() {
  const howDowYouFeel = faker.commerce.productAdjective()
  return utils.capitalize(howDowYouFeel)
}

function getWhatDidYouDo(activities, separator = '\n') {
  return githubActivity.arrayToText(activities, separator)
}

function getWhatWillYouDo(activities) {
  let repoNames = activities.map(activity =>
    githubActivity.getRepoName(activity)
  )
  repoNames = Array.from(new Set(repoNames))

  if (repoNames.length === 0) return '¯\\_(ツ)_/¯'

  const reposText =
    repoNames.length > 1
      ? `${repoNames.slice(0, -1).join(', ')} and ${repoNames.slice(-1)[0]}`
      : repoNames[0]

  return `Probably more work on ${reposText}`
}

function getBlocking() {
  return utils.capitalize(faker.hacker.phrase())
}

main().catch(error =>
  console.error('An error ocurred trying to send the standup\n', error)
)
