const faker = require('faker')
const chalk = require('chalk')
const arg = require('arg')
const Slack = require('./slack')
const githubActivity = require('./githubActivity')
const utils = require('./utils')

const SLACK_TOKEN = utils.envGet('SLACK_TOKEN', '') // https://api.slack.com/custom-integrations/legacy-tokens

async function main() {
  let args = {}

  try {
    args = arg({
      // Types
      '--user': String,
      '--help': Boolean,
      '--watch': Boolean,

      // Aliases
      '-w': '--watch',
      '-l': '--log'
    })
  } catch (error) {
    // Ignore unknown flag error
  }

  if (!SLACK_TOKEN || !args['--user']) {
    console.log(`geekbot.js

${chalk.bold.white('ENV variables')}:
  SLACK_TOKEN   You can get it from https://api.slack.com/custom-integrations/legacy-tokens

${chalk.bold.white('Flags')}:
  --user, -u    Github username. Required
  --watch, -w   Stays open watching for new geekbot chats. Defaults to false and logs to stdout
  --yesterday   Force yesterdays text
  --today       Force todays text
`)
    return process.exit()
  }

  await run(args)
}

async function run(args) {
  if (args['--watch']) {
    const slack = new Slack(SLACK_TOKEN)
    const geekbotId = await slack.getGeekbotId()

    slack.onUserMessage(geekbotId, async function(message) {
      const timestamp = parseInt(message.ts, 10) * 1000

      if (timestamp > utils.getToday().getTime()) {
        switch (message) {
          case 'How do you feel today?':
            await slack.postMessage(geekbotId, getHowDoYouFeel())
            break
          case 'What did you do yesterday?': {
            const activities = await getTodayActivities(args['--user'])
            await slack.postMessage(geekbotId, getWhatDidYouDo(activities))
            break
          }
          case 'What will you do today?': {
            const activities = await getTodayActivities(args['--user'])
            await slack.postMessage(geekbotId, getWhatWillYouDo(activities))
            break
          }
          case 'Anything blocking your progress?':
            await slack.postMessage(geekbotId, getBlocking())
            break
          default:
            break
        }
      }
    })
  } else {
    const activities = await getTodayActivities(args['--user'])
    if (activities.length === 0) {
      return console.log('No Github activity today, you couch potato')
    }

    // prettier-ignore
    console.log(`${chalk.bold.white('How do you feel today?')}
  ${getHowDoYouFeel()}
${chalk.bold.white('What did you do yesterday?')}
  ${getWhatDidYouDo(activities, '\n  ')}
${chalk.bold.white('What will you do today?')}
  ${getWhatWillYouDo(activities)}
${chalk.bold.white('Anything blocking your progress?')}
  ${getBlocking()}`)
  }
}

async function getTodayActivities(username) {
  return await githubActivity.filter(username)
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
