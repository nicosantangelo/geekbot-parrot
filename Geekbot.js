const faker = require('faker')
const chrono = require('chrono-node')
const GithubActivity = require('./GithubActivity')
const utils = require('./utils')

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

module.exports = Geekbot
