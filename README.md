# [geekbot](https://geekbot.io/) parrot

Tired of answering geekbot standups manually?<br/>
Run this script and answer it with your github activity.

## Run

```bash
git clone (...)
npm install
node geekbot.js --help
```

to see the options. You'll need a [Slack token](https://api.slack.com/custom-integrations/legacy-tokens)

### Example:

```
➜  geekbot git:(master) ✗
SLACK_TOKEN=xoxp-123123123-123123123-123123123-dadvnx2190312 node geekbot.js --user NicoSantangelo

How do you feel today?
  Awesome
What did you do yesterday?
  Worked on marketplace
  Worked on agora
  Worked on decentraland-eth
What will you do today?
  Probably more work on marketplace, land, decentraland-eth, agora and decentraland-tetromino
Anything blocking your progress?
  The THX circuit is down, quantify the back-end firewall so we can reboot the PNG hard drive!
```

### Respond automatically (upon request, using RTM):

```
➜  geekbot git:(master) ✗
SLACK_TOKEN=xoxp-123123123-123123123-123123123-dadvnx2190312 node geekbot.js --user NicoSantangelo --watch
```

## Changing the responses

If you don't like the the script output you can clone and change the following functions on geekbot.js:

```javascript
getTodayActivities(username, beforeDateText = 'today')
getHowDoYouFeel()
getWhatDidYouDo(activities, separator = '\n')
getWhatWillYouDo(activities)
getBlocking()
```

## With NPM

```bash
$ npm i -g geekbot-parrot
$ geekbot-parrot xoxp-123123123-123123123-123123123-dadvnx2190312 --user NicoSantangelo
```

or via NPX

```bash
$ npx geekbot-parrot xoxp-123123123-123123123-123123123-dadvnx2190312 --user NicoSantangelo
```

:golfing_man:

