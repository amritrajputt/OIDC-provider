import { registerClient } from '../service/client.service.js'

const clientController = async (req, res) => {
    try {
        const { app_name, redirect_uri } = req.body;
        const response = await registerClient(app_name, redirect_uri);
        return res.status(response.statusCode).json(response);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error",
            error: error.error || []
        });
    }
}

export { clientController }