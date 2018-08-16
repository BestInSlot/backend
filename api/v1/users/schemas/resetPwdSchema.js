module.exports = {
    body: {
        type: 'object',
        properties: {
            email: { type: 'string' }
        },
        required: ['email']
    },

    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
}