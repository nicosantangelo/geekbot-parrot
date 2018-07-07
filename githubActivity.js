const request = require('request-promise-native')

const githubActivity = Object.freeze({
  async filter(githubUser, beforeDate) {
    return request({
      url: `https://api.github.com/users/${githubUser}/events`,
      headers: {
        'User-Agent': 'Geekbot fill'
      },
      json: true
    }).then(activities =>
      activities.filter(
        activity =>
          !beforeDate ||
          new Date(activity.created_at).getTime() >= beforeDate.getTime()
      )
    )
  },

  arrayToText(activities, separator = ', ') {
    const repoNames = new Set()
    let texts = []

    for (const activity of activities) {
      const repoName = this.getRepoName(activity)
      const activityText = this.toText(activity)

      if (!activityText) continue
      if (repoNames.has(repoName)) continue

      repoNames.add(repoName)
      texts.push(activityText)
    }

    return texts.join(separator)
  },

  toText(activity) {
    switch (activity.type) {
      case 'CreateEvent': {
        const description = ''
        if (activity.description) description = ` (${activity.description})`

        return `Created ${activity.ref}${description}`
      }
      case 'WatchEvent':
        return ''
      default:
        return `Worked on ${this.getRepoName(activity)}`
    }
  },

  getRepoName(activity) {
    if (!activity) {
      return ''
    } else if (activity.repository && activity.repository.name) {
      return activity.repository.name
    } else if (activity.repo && activity.repo.name) {
      return activity.repo.name.split('/').pop()
    } else if (activity.ref) {
      return activity.ref
    } else {
      return ''
    }
  },

  getRepoUrl(activity) {
    return ''
  }
})

module.exports = githubActivity
