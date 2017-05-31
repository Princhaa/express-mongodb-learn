var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var PostsSchema = new Schema({
    _creator: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
    },

    image: [{
        type: String,

    }],

    category: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    sold: {
        type: Boolean,
        required: true
    },

})

module.exports = mongoose.model('Post', PostsSchema);