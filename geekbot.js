const faker = require('faker')
const chalk = require('chalk')
const arg = require('arg')
const chrono = require('chrono-node')
const Slack = require('./Slack')
const GithubActivity = require('./GithubActivity')
const utils = require('./utils')

const SLACK_TOKEN = utils.envGet('SLACK_TOKEN', '') // https://api.slack.com/custom-integrations/legacy-tokens

async function main() {
  let args = {}

  try {
    args = arg({
      '--user': String,
      '--organizations': String,
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
  --user          Github username. Required
  --organizations Which organizations to use when filtering github activity. It supports multiple organizations separated by spaces.
                  An username might acts as an organization, so bear that in mind. The repo names look like: `orgName/repoName`. Defaults to all organizations
  --answer        Stays open watching for new geekbot chats. Options:
                    - respond: Try to answer the current geekbot flow
                    - watch: Works as 'respond' but stays open watching for new messages
                    - log: pipe result to stdout
                  Defaults to 'log'
  --from          Timeframe to look for Github activity. Defaults to yesterday (for each run). It supports natural language via https://github.com/wanasit/chrono
  --help          Print this help
`)
    return process.exit()
  }

  await run(args)
}

async function run(args) {
  const geekbot = new Geekbot(
    args['--user'],
    args['--organizations'].split(' '),
    args['--from']
  )

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
          await slack.postMessage(geekbotId, geekbot.getHowDoYouFeel())
        } else if (message.search('What did you do yesterday?') !== -1) {
          await slack.postMessage(geekbotId, await geekbot.getWhatDidYouDo())
        } else if (message.search('What will you do today?') !== -1) {
          await slack.postMessage(geekbotId, await geekbot.getWhatWillYouDo())
        } else if (message.search('Anything blocking your progress?') !== -1) {
          await slack.postMessage(geekbotId, geekbot.getBlocking())
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
  ${geekbot.getHowDoYouFeel()}
${chalk.bold.white('What did you do yesterday?')}
  ${await geekbot.getWhatDidYouDo('\n  ')}
${chalk.bold.white('What will you do today?')}
  ${await geekbot.getWhatWillYouDo()}
${chalk.bold.white('Anything blocking your progress?')}
  ${geekbot.getBlocking()}`)
      break
    }
  }
}

class Geekbot {
  constructor(username, organizations = []) {
    this.githubActivity = new GithubActivity(username, organizations)
  }

  getHowDoYouFeel() {
    const howDowYouFeel = faker.commerce.productAdjective()
    return utils.capitalize(howDowYouFeel)
  }

  async getWhatDidYouDo(separator = '\n') {
    const activities = await this.getActivities()
    const text = this.activitiesToText(activities, separator)
    return text || 'nope'
  }

  async getWhatWillYouDo() {
    const activities = await this.getActivities()
    let repoNames = activities
      .map(activity => this.githubActivity.getRepoName(activity))
      .filter(name => !!name)

    repoNames = Array.from(new Set(repoNames))

    if (repoNames.length === 0) return 'nope'

    const reposText =
      repoNames.length > 1
        ? `${repoNames.slice(0, -1).join(', ')} and ${repoNames.slice(-1)[0]}`
        : repoNames[0]

    return `Probably more work on ${reposText}`
  }

  getBlocking() {
    return utils.capitalize(faker.hacker.phrase())
  }

  async getActivities(beforeDateText) {
    const beforeDate = chrono.parseDate(beforeDateText, new Date())
    return await this.githubActivity.filter(beforeDate)
  }

  activitiesToText(activities, separator = ', ') {
    const repoNames = new Set()
    let texts = []

    for (const activity of activities) {
      const repoName = this.githubActivity.getRepoName(activity, true)
      if (repoNames.has(repoName)) continue

      const activityText = this.activityToText(activity)
      if (!activityText) continue

      repoNames.add(repoName)
      texts.push(activityText)
    }

    return texts.join(separator)
  }

  activityToText(activity) {
    const repoName = this.githubActivity.getRepoName(activity)
    if (!repoName) return ''

    switch (activity.type) {
      case 'CreateEvent': {
        const description = ''
        if (activity.description) description = ` (${activity.description})`

        return `Created ${repoName}${description}`
      }
      case 'WatchEvent':
        return ''
      default:
        return `Worked on ${repoName}`
    }
  }
}

main().catch(error =>
  console.error('An error ocurred trying to send the standup\n', error)
)
