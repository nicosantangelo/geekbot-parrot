const faker = require('faker')
const chrono = require('chrono-node')
const GithubActivity = require('./GithubActivity')
const utils = require('./utils')

class Geekbot {
  constructor(username, organizations = [], beforeDateText) {
    organizations = organizations.filter(orgName => !!orgName)

    this.githubActivity = new GithubActivity(username, organizations)
    this.beforeDateText = beforeDateText
    this.activities = []
  }

  getHowDoYouFeel() {
    this.resetCache()
    const howDowYouFeel = faker.commerce.productAdjective()
    return utils.capitalize(howDowYouFeel)
  }

  async getWhatDidYouDo(separator = '\n') {
    let text = 'nope'
    if (await this.hasActivities()) {
      text = await this.activitiesToText(separator)
    }
    return text
  }

  async getWhatWillYouDo() {
    const activities = await this.getActivities()
    if (activities.length === 0) return 'nope'

    let repoNames = activities.map(activity =>
      this.githubActivity.getRepoName(activity)
    )
    repoNames = Array.from(new Set(repoNames))

    const reposText =
      repoNames.length > 1
        ? `${repoNames.slice(0, -1).join(', ')} and ${repoNames.slice(-1)[0]}`
        : repoNames[0]

    return `Probably more work on ${reposText}`
  }

  getBlocking() {
    this.resetCache()
    return utils.capitalize(faker.hacker.phrase())
  }

  async getActivities() {
    if (this.activities.length === 0) {
      const beforeDate = chrono.parseDate(this.beforeDateText, new Date())
      const activities = await this.githubActivity.filter(beforeDate)

      for (const activity of activities) {
        if (this.inOrganizations(activity)) {
          this.activities.push(activity)
        }
      }
    }

    return this.activities
  }

  async hasActivities() {
    return (await this.getActivities()).length > 0
  }

  inOrganizations(activity) {
    return !!this.githubActivity.getRepoName(activity)
  }

  async activitiesToText(separator = ', ') {
    const activities = await this.getActivities()
    const repoNames = new Set()
    let texts = []

    for (const activity of activities) {
      const repoName = this.githubActivity.getRepoName(activity)
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
        const description = activity.description
          ? ` (${activity.description})`
          : ''

        return `Created ${repoName}${description}`
      }
      case 'WatchEvent':
        return ''
      default:
        return `Worked on ${repoName}`
    }
  }

  resetCache() {
    this.activities = []
  }
}

module.exports = Geekbot
