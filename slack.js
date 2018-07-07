const { WebClient, RTMClient } = require('@slack/client')

class Slack {
  constructor(token) {
    this.token = token
    this.client = new WebClient(token)
    this.rtm = undefined
    this.users = []
  }

  async getGeekbotId(cursor) {
    const response = await this.client.users.list({ limit: 100, cursor })
    if (!response.ok) {
      throw new Error(
        'An error occurred trying to get the user list from Slack',
        response
      )
    }

    const { members, response_metadata } = response
    const geekbot = members.find(
      member => member.name === 'geekbot' && member.is_bot === true
    )

    if (!geekbot) {
      if (response_metadata.next_cursor) {
        throw new Error('Couldn\'t find geekbot on this Slack Team')
      } else {
        return this.getGeekbotId(response_metadata.next_cursor)
      }
    }

    return geekbot.id
  }

  async postMessage(channel, text) {
    return this.client.chat.postMessage({ channel, text, as_user: true })
  }

  onUserMessage(userId, callback) {
    if (!userId) {
      throw new Error('You need a valid user id')
    }

    if (!this.rtm) {
      this.startRTM()
    }

    this.rtm.on('message', message => {
      if (message.user === userId) {
        callback(message)
      }
    })
  }

  startRTM() {
    this.rtm = new RTMClient(this.token)
    this.rtm.start()
  }

  stopRTM() {
    this.rtm.stop()
    this.rtm = undefined
  }
}

module.exports = Slack
