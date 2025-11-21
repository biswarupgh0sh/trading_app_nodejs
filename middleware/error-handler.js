import { StatusCodes } from "http-status-codes"

const errorHandlerMiddleware = (err, req, res, next) => {
    const defaultError = {
        statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        msg: err.message || "Something went wrong, try again later"
    };


    if(err.name === "ValidatingError"){
        defaultError.statusCode = StatusCodes.BAD_REQUEST;
        defaultError.msg = Object.values(err.error)
            .map((item) => item.message)
            .join(",");
    }

    if(err.code && err.code === 11000) {
        defaultError.statusCode = StatusCodes.BAD_REQUEST;
        defaultError.msg = `${Object.keys(err.keyValue)} field has to be entered`;
    }

    if(err.name == "CastError") {
        defaultError.statusCode = StatusCodes.BAD_REQUEST;
        defaultError.msg = `No item found with id: ${err.value}`;
    }

    return res.status(defaultError.statusCode).json({ msg: defaultError.msg });
}


export default errorHandlerMiddleware;