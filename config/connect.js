import mongoose from "mongoose"


const connectDb = async (url) => {
    return mongoose.connect(url);
}


export default connectDb;