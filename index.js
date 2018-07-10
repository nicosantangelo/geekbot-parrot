const arg = require('arg')
const chalk = require('chalk')
const Slack = require('./Slack')
const Geekbot = require('./Geekbot')
const utils = require('./utils')

const SLACK_TOKEN = utils.envGet('SLACK_TOKEN', '')

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
  args = Object.assign(
    { '--organizations': '', '--answer': 'log', '--from': 'yesterday' },
    args
  )

  if (!SLACK_TOKEN || !args['--user'] || args['--help']) {
    console.log(`${chalk.bold.white('ENV variables')}:
  SLACK_TOKEN   You can get it from https://api.slack.com/custom-integrations/legacy-tokens

${chalk.bold.white('Flags')}:
  --user          Github username. Required

  --organizations Which organizations to use when filtering github activity. It supports multiple organizations separated by commas (no spaces).
                  An username might acts as an organization, so bear that in mind. The repo names look like: 'orgName/repoName'.
                  Example: --organizations 'facebook,google'. Defaults to all organizations

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
    args['--organizations'].split(','),
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

      await slack.startRTM()
      slack.onUserMessage(geekbotId, message => answerGeekbot(message.text))

      await answerGeekbot(lastMessage.text)

      async function answerGeekbot(message) {
        if (!(await geekbot.hasActivities())) {
          console.log(
            `Couldn't find any Github activity for the given timeframe. You may want to send a cancel?\nMessage skipped: "${message}"`
          )
          return exitOnEnd ? await exit(slack) : geekbot.resetCache()
        }

        if (message.search('How do you feel today?') !== -1) {
          await slack.postMessage(geekbotId, geekbot.getHowDoYouFeel())
        } else if (message.search('What did you do yesterday?') !== -1) {
          await slack.postMessage(geekbotId, await geekbot.getWhatDidYouDo())
        } else if (message.search('What will you do today?') !== -1) {
          await slack.postMessage(geekbotId, await geekbot.getWhatWillYouDo())
        } else if (message.search('Anything blocking your progress?') !== -1) {
          await slack.postMessage(geekbotId, geekbot.getBlocking())
          if (exitOnEnd) await exit(slack)
        } else {
          console.log(`Don't know how to answer to ${message}`)
          if (exitOnEnd) await exit(slack)
        }
      }
      break
    }
    case 'log':
    default: {
      if (await geekbot.hasActivities()) {
        // prettier-ignore
        console.log(`${chalk.bold.white('How do you feel today?')}
  ${geekbot.getHowDoYouFeel()}
${chalk.bold.white('What did you do yesterday?')}
  ${await geekbot.getWhatDidYouDo('\n  ')}
${chalk.bold.white('What will you do today?')}
  ${await geekbot.getWhatWillYouDo()}
${chalk.bold.white('Anything blocking your progress?')}
  ${geekbot.getBlocking()}`)
      } else {
        console.log(
          `Couldn't find any Github activity for the given timeframe, skipping.\nYou may want to send a cancel?`
        )
      }
      break
    }
  }
}

async function exit(slack) {
  await slack.stopRTM()
  process.exit()
}

main().catch(error =>
  console.error('An error ocurred trying to send the standup\n', error)
)
