var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MessageSchema = mongoose.Schema({
    _sender: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    _receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    message: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Message', MessageSchema);