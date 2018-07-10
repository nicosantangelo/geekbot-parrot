const { WebClient, RTMClient } = require('@slack/client')

class Slack {
  constructor(token) {
    this.token = token
    this.client = new WebClient(token)
    this.rtm = undefined
    this.users = []
  }

  async getUserId(options = {}, cursor) {
    const { username, isBot = false } = options
    const response = await this.client.users.list({ limit: 100, cursor })
    if (!response.ok) {
      throw new Error(
        'An error occurred trying to get the user list from Slack',
        response
      )
    }

    const { members, response_metadata } = response
    const user = members.find(
      member => member.name === username && member.is_bot === isBot
    )

    if (!user) {
      if (response_metadata.next_cursor) {
        throw new Error(`Couldn't find user '${username}' on this Slack Team`)
      } else {
        return this.getUserId(options, response_metadata.next_cursor)
      }
    }

    return user.id
  }

  async getUserDMChannelId(options = {}, cursor) {
    const { userId, isBot } = options
    const response = await this.client.im.list({ limit: 100, cursor })
    if (!response.ok) {
      throw new Error(
        'An error occurred trying to get the im list from Slack',
        response
      )
    }

    const { ims, response_metadata } = response
    const im = ims.find(member => member.user === userId)

    if (!im) {
      if (response_metadata.next_cursor) {
        throw new Error(
          `Couldn't find channel for '${userId}' on this Slack Team`
        )
      } else {
        return this.getUserChannelId(options, response_metadata.next_cursor)
      }
    }

    return im.id
  }

  async getChannelHistory(options = {}) {
    const response = await this.client.im.history(options)
    if (!response.ok) {
      throw new Error(
        'An error occurred trying to get the im history from Slack',
        response
      )
    }
    return response.messages
  }

  async postMessage(channel, text) {
    return this.client.chat.postMessage({ channel, text, as_user: true })
  }

  onUserMessage(userId, callback) {
    if (!userId) {
      throw new Error('You need a valid user id')
    }

    if (!this.rtm) {
      throw new Error('You need to start RTM first')
    }

    this.rtm.on('message', message => {
      if (message.user === userId) {
        console.log('ON MESSAGE =>', message.text)
        callback(message)
      }
    })
  }

  async startRTM() {
    this.rtm = new RTMClient(this.token)
    this.rtm.start()
    return new Promise(resolve =>
      this.rtm.on('connected', message => resolve())
    )
  }

  async stopRTM() {
    this.rtm.disconnect()

    return new Promise(resolve =>
      this.rtm.on('disconnected', () => {
        this.rtm = undefined
        resolve()
      })
    )
  }
}

module.exports = Slack
