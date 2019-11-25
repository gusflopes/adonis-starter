'use strict'

/**
 * @typedef {import('@adonisjs/framework/src/Request')} Request
 * @typedef {import('@adonisjs/framework/src/Response')} Response
 * @typedef {import('@adonisjs/auth/src/Schemes/Session')} AuthSession
 */

const { subDays, isAfter } = require('date-fns')
const crypto = require('crypto')
const User = use('App/Models/User')
const Mail = use('Mail')

class ForgotPasswordController {
/**
 *
 * @param {request:Request, response:Response, auth:JwtScheme} context
 * @returns {Promise} context.response.status(200).send({ token })
 */

  async store ({ request, response }) {
    try {
      const email = request.input('email')
      const user = await User.findByOrFail('email', email)

      user.token = crypto.randomBytes(10).toString('hex')
      user.token_created_at = new Date()

      await user.save()

      await Mail.send(
        ['emails.forgot_password'], // template
        { email, token: user.token, link: `${request.input('redirect_url')}?token=${user.token}` }, // parâmetros da template
        message => {
          message
            .to(user.email)
            .from('gusflopes86@gmail.com', 'Gustavo | LSCONT')
            .subject('Recuperação de senha')
        }
      )
    } catch (err) {
      return response
        .status(err.status)
        .send({ error: { message: 'Algo não deu certo. Esse e-mail existe?' } })
    }
  }

  async update ({ request, response }) {
    try {
      const { token, password } = request.all()

      const user = await User.findByOrFail('token', token)

      const tokenExpired = isAfter(subDays(new Date(), 2), user.token_created_at)

      if (tokenExpired) {
        return response
          .status(401)
          .send({ error: { message: 'O token de recuperação está expirado' } })
      }

      user.token = null
      user.token_created_at = null
      user.password = password

      await user.save()
    } catch (err) {
      return response
        .status(err.status)
        .send({ error: { message: 'Não foi possível resetar sua senha. Faça uma nova solicitação.' } })
    }
  }
}

module.exports = ForgotPasswordController
