const connectedShows = {}
// Structure: { showId: { seatId: socketId } }

export const initSocket = (io) => {

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id)

        socket.on('join-show', (showId) => {
            socket.join(showId)
            console.log(`Socket ${socket.id} joined show ${showId}`)

            if (connectedShows[showId]) {
                socket.emit('current-selecting', connectedShows[showId])
            }
        })

        socket.on('select-seat', ({ showId, seatId }) => {
            if (!connectedShows[showId]) {
                connectedShows[showId] = {}
            }

            // Store socket.id instead of userId
            connectedShows[showId][seatId] = socket.id

            // Broadcast to ALL other users
            socket.to(showId).emit('seat-selected', { seatId, socketId: socket.id })

            console.log(`Seat ${seatId} selected by ${socket.id} in show ${showId}`)
        })

        socket.on('deselect-seat', ({ showId, seatId }) => {
            if (connectedShows[showId]) {
                delete connectedShows[showId][seatId]
            }

            socket.to(showId).emit('seat-deselected', { seatId })

            console.log(`Seat ${seatId} deselected in show ${showId}`)
        })

        socket.on('leave-show', ({ showId, selectedSeats }) => {
            if (connectedShows[showId] && selectedSeats) {
                selectedSeats.forEach(seatId => {
                    delete connectedShows[showId][seatId]
                    socket.to(showId).emit('seat-deselected', { seatId })
                })
            }
            socket.leave(showId)
            console.log(`Socket ${socket.id} left show ${showId}`)
        })

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id)

            // Release all seats this socket was holding
            Object.keys(connectedShows).forEach(showId => {
                const show = connectedShows[showId]
                Object.keys(show).forEach(seatId => {
                    if (show[seatId] === socket.id) {
                        delete show[seatId]
                        io.to(showId).emit('seat-deselected', { seatId })
                    }
                })
            })
        })
    })
}