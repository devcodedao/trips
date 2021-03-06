const { Ticket } = require('./../../../model/Ticket');
const { Trip } = require('./../../../model/Trip');
const {sendSuccessfulRegisterEmail}=require('./../../../services/bookTicket')
module.exports.createTicket = (req, res, next) => {
    /**
   * @note Trong payload chưa ký :_id
   */
    const userId = req.user._id;
    const { tripId, seatCodes } = req.body;
    // console.log(userId, tripId, seatCodes)
    Trip.findById(tripId)
        .populate("toStation")
        .populate("fromStation")
        .then(trip => {
            if (!trip) return Promise.reject({ status: 404, message: "Trip not found" })
            /**
             * @todo availableSeats :  lay ds seat còn trống chưa có người isBook
             */
            const availableSeats = trip.seats
                .filter(seat => !seat.isBook)
                .map(seat => seat.code)
            let errSeats = [];
            /**
             * @todo seatCodes.forEach : kiểm tra ds ghế đang đặt đã có người đặt chưa
             */
            seatCodes.forEach(seatCode => {
                if (availableSeats.indexOf(seatCode) === -1) errSeats.push(seatCode)
            });
            if (errSeats.length > 0) return Promise.reject({
                status: 400,
                message: "Some seats not available",
                notAvailableSeats: errSeats
            })
            const newTicket = new Ticket({
                userId, tripId,
                seats: seatCodes.map(seat => ({ code: seat, isBook: true })),
                totalPrice: trip.price * seatCodes.length
            })
            /**
             * @Todo cập nhật lại ds ghế trong Trip
             */
            trip.seats = trip.seats.map(seat => {
                if (seatCodes.indexOf(seat.code) > -1) {
                    seat.isBook = true
                    return seat;
                }
                return seat;
            })
            return Promise.all([newTicket.save(), trip.save()])
        })
        .then(result => {
          
            res.status(200).json(result[0])
           sendSuccessfulRegisterEmail(result[0],result[1],req.user)
        })
        .catch(err => {
            if (err.status) return res.status(err.status).json(err.message)
            return res.status(500).json(err)
        })

}
