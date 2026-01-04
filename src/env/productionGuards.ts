export const assertNotProduction = (msg: string) => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(msg)
    }
}
