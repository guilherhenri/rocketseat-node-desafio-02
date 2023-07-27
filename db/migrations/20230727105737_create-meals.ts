import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('meals', (table) => {
    table.uuid('id').primary()
    table.string('name', 255).notNullable()
    table.text('description').notNullable()
    table.datetime('datetime', { precision: 6 }).defaultTo(knex.fn.now())
    table.boolean('in_diet').defaultTo(false)
    table.uuid('user_id').unsigned().index().references('id').inTable('users')
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('meals')
}
