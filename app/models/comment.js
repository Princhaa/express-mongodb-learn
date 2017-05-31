var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },

    _inPost: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },

    _creator: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Comment', commentSchema);