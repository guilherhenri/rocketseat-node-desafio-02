import { randomUUID } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', checkSessionIdExists)

  app.get('/', async (request, reply) => {
    const { sessionId } = request.cookies

    const user = await knex('users')
      .where('session_id', sessionId)
      .select()
      .first()

    if (!user) {
      return reply.status(404).send('User not found')
    }

    const meals = await knex('meals')
      .where('user_id', user.id)
      .orderBy('datetime', 'desc')
      .select()

    return meals
  })

  app.get('/:id', async (request, reply) => {
    const getMealParamSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getMealParamSchema.parse(request.params)
    const { sessionId } = request.cookies

    const user = await knex('users')
      .where('session_id', sessionId)
      .select()
      .first()

    if (!user) {
      return reply.status(404).send('User not found')
    }

    const meal = await knex('meals')
      .where({
        id,
        user_id: user.id,
      })
      .select()
      .first()

    return meal
  })

  app.get('/metrics', async (request, reply) => {
    const { sessionId } = request.cookies

    const user = await knex('users')
      .where('session_id', sessionId)
      .select()
      .first()

    if (!user) {
      return reply.status(404).send('User not found')
    }

    const totalMealsResponse = await knex('meals')
      .where('user_id', user.id)
      .count('id', { as: 'total_meals' })
      .first()

    const totalDietMealsResponse = await knex('meals')
      .where({
        user_id: user.id,
        in_diet: true,
      })
      .count('id', { as: 'diet_meals' })
      .first()

    const totalNotDietMealsResponse = await knex('meals')
      .where({
        user_id: user.id,
        in_diet: false,
      })
      .count('id', { as: 'not_diet_meals' })
      .first()

    const sequenceResponse = await knex('meals')
      .where('user_id', user.id)
      .orderBy('datetime', 'desc')
      .select()
      .then((meals) => {
        let bestSequence = 0
        let actualSequence = 0

        meals.forEach((meal) => {
          if (meal.in_diet) {
            actualSequence++

            if (actualSequence > bestSequence) {
              bestSequence = actualSequence
            }
          } else {
            if (actualSequence > bestSequence) {
              bestSequence = actualSequence
            }

            actualSequence = 0
          }
        })

        return { best_diet_sequence: bestSequence }
      })

    return {
      ...totalMealsResponse,
      ...totalDietMealsResponse,
      ...totalNotDietMealsResponse,
      ...sequenceResponse,
    }
  })

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      datetime: z.string(),
      in_diet: z.boolean(),
    })

    const body = createMealBodySchema.parse(request.body)
    const { sessionId } = request.cookies

    const user = await knex('users')
      .where('session_id', sessionId)
      .select()
      .first()

    if (!user) {
      return reply.status(404).send('User not found')
    }

    await knex('meals').insert({
      id: randomUUID(),
      ...body,
      user_id: user.id,
    })

    return reply.status(201).send()
  })

  app.put('/:id', async (request, reply) => {
    const getMealParamSchema = z.object({
      id: z.string().uuid(),
    })
    const updateMealBodySchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      datetime: z.string().optional(),
      in_diet: z.boolean().optional(),
    })

    const { id } = getMealParamSchema.parse(request.params)
    const body = updateMealBodySchema.parse(request.body)
    const { sessionId } = request.cookies

    const user = await knex('users')
      .where('session_id', sessionId)
      .select()
      .first()

    if (!user) {
      return reply.status(404).send('User not found')
    }

    await knex('meals')
      .where({
        id,
        user_id: user.id,
      })
      .update({
        ...body,
      })

    return reply.status(201).send()
  })

  app.delete('/:id', async (request, reply) => {
    const getMealParamSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getMealParamSchema.parse(request.params)
    const { sessionId } = request.cookies

    const user = await knex('users')
      .where('session_id', sessionId)
      .select()
      .first()

    if (!user) {
      return reply.status(404).send('User not found')
    }

    await knex('meals')
      .where({
        id,
        user_id: user.id,
      })
      .del()

    return reply.send()
  })
}
