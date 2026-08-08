import redis from './config/redis.js'

const LOCK_TTL_SECONDS = 120 

const lockKey = (showId, seatId) => `lock:${showId}:${seatId}`

export const initSocket = (io) => {

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id)

        const mySelections = new Set()

        socket.on('join-show', async (showId) => {
            socket.join(showId)
            console.log(`Socket ${socket.id} joined show ${showId}`)

            try {
                const keys = await redis.keys(`lock:${showId}:*`)
                if (keys.length === 0) return

                const values = await redis.mget(...keys)
                const currentSelecting = {}

                keys.forEach((key, i) => {
                    const seatId = key.split(':')[2]
                    if (values[i]) currentSelecting[seatId] = values[i]
                })

                socket.emit('current-selecting', currentSelecting)
            } catch (err) {
                console.error('Redis error on join-show:', err.message)
            }
        })

        socket.on('select-seat', async ({ showId, seatId }) => {
            try {
                await redis.set(lockKey(showId, seatId), socket.id, { ex: LOCK_TTL_SECONDS, nx: true })
                mySelections.add(`${showId}:${seatId}`)

                socket.to(showId).emit('seat-selected', { seatId, socketId: socket.id })
                console.log(`Seat ${seatId} selected by ${socket.id} in show ${showId}`)
            } catch (err) {
                console.error('Redis error on select-seat:', err.message)
            }
        })

        socket.on('deselect-seat', async ({ showId, seatId }) => {
            try {
                await redis.del(lockKey(showId, seatId))
                mySelections.delete(`${showId}:${seatId}`)

                socket.to(showId).emit('seat-deselected', { seatId })
                console.log(`Seat ${seatId} deselected in show ${showId}`)
            } catch (err) {
                console.error('Redis error on deselect-seat:', err.message)
            }
        })

        socket.on('leave-show', async ({ showId, selectedSeats }) => {
            if (selectedSeats && selectedSeats.length > 0) {
                try {
                    await Promise.all(selectedSeats.map(seatId => redis.del(lockKey(showId, seatId))))
                    selectedSeats.forEach(seatId => {
                        mySelections.delete(`${showId}:${seatId}`)
                        socket.to(showId).emit('seat-deselected', { seatId })
                    })
                } catch (err) {
                    console.error('Redis error on leave-show:', err.message)
                }
            }
            socket.leave(showId)
            console.log(`Socket ${socket.id} left show ${showId}`)
        })

        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id)

            try {
                await Promise.all(
                    Array.from(mySelections).map(async (entry) => {
                        const [showId, seatId] = entry.split(':')
                        await redis.del(lockKey(showId, seatId))
                        io.to(showId).emit('seat-deselected', { seatId })
                    })
                )
            } catch (err) {
                console.error('Redis error on disconnect cleanup:', err.message)
            }
        })
    })
}