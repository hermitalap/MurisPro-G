import axios from 'axios'

let accessTokenPromise = null
let cachedAccessToken = null

function readAccessTokenFromUrl() {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('muris_token')
  if (!token) return null

  url.searchParams.delete('muris_token')
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
  return token
}

function getCachedToken() {
  if (cachedAccessToken) return cachedAccessToken

  const urlToken = readAccessTokenFromUrl()
  if (urlToken) {
    cachedAccessToken = urlToken
    sessionStorage.setItem('murisProAccessToken', urlToken)
    return cachedAccessToken
  }

  const sessionToken = sessionStorage.getItem('murisProAccessToken')
  if (sessionToken) {
    cachedAccessToken = sessionToken
    return cachedAccessToken
  }

  return null
}

function clearCachedToken() {
  cachedAccessToken = null
  accessTokenPromise = null
  sessionStorage.removeItem('murisProAccessToken')
}

export async function getMurisProToken() {
  const cachedToken = getCachedToken()
  if (cachedToken) return cachedToken
  if (!window.pywebview) return null
  if (accessTokenPromise) return accessTokenPromise

  accessTokenPromise = new Promise((resolve, reject) => {
    let attempts = 0
    const maxAttempts = 50

    const tryGetToken = async () => {
      attempts += 1
      if (window.pywebview?.api?.get_access_token) {
        try {
          const token = await window.pywebview.api.get_access_token()
          if (token) {
            cachedAccessToken = token
            sessionStorage.setItem('murisProAccessToken', token)
            resolve(token)
            return
          }
        } catch (error) {
          reject(error)
          return
        }
      }

      if (attempts >= maxAttempts) {
        reject(new Error('无法连接到 pywebview 访问令牌'))
        return
      }

      setTimeout(tryGetToken, 100)
    }

    tryGetToken()
  }).catch((error) => {
    accessTokenPromise = null
    throw error
  })

  return accessTokenPromise
}

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
})

api.interceptors.request.use(async (config) => {
  const token = await getMurisProToken()
  config.headers = config.headers || {}
  if (token) {
    config.headers['X-MurisPro-Token'] = token
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async (error) => {
    const config = error.config
    const message = error.response?.data?.error || ''
    if (
      config &&
      !config._murisProTokenRetry &&
      error.response?.status === 403 &&
      String(message).includes('pywebview access token')
    ) {
      config._murisProTokenRetry = true
      clearCachedToken()
      return api(config)
    }
    return Promise.reject(error)
  }
)

export default api
