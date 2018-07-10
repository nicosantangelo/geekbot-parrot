const request = require('request-promise-native')

class GithubActivity {
  constructor(username, organizations = []) {
    if (!username) {
      throw new Error('You need to supply an username')
    }

    this.username = username
    this.organizations = organizations
  }

  async filter(beforeDate) {
    const activities = await request({
      url: `https://api.github.com/users/${this.username}/events`,
      headers: {
        'User-Agent': 'Geekbot fill'
      },
      json: true
    })

    return activities.filter(
      activity =>
        !beforeDate ||
        new Date(activity.created_at).getTime() >= beforeDate.getTime()
    )
  }

  getRepoName(activity) {
    let name = ''


    if (!activity) {
      name = ''
    } else if (activity.repository && activity.repository.name) {
      name = activity.repository.name
    } else if (activity.repo && activity.repo.name) {
      name = activity.repo.name
    } else if (activity.ref) {
      name = activity.ref
    } else {
      name = ''
    }

    return this.sanitizeRepoName(name)
  }

  sanitizeRepoName(name) {
    if (this.organizations.length === 0) {
      return name
    } else {
      for (const orgName of this.organizations) {
        const orgPrefix = `${orgName}/`
        const hasOrg = name.search(orgPrefix) !== -1
        if (hasOrg) {
          return name.replace(orgPrefix, '')
        }
      }
      return ''
    }
  }
}

module.exports = GithubActivity
