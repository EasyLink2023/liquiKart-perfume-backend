const sendResponse = (res, { status = 200, data = null, message = '', pagination }) => {
  res.status(status).json({
    status,
    message,
    data,
    pagination
  });
};

export default sendResponse;