// import XXXRoutes from "./filename.js";


const constructorMethod = (app) => {
	// app.use("/routePath", XXXRoutes);

    app.use("{*splat}", (req, res) => {
        res.status(404).json({ error: "Route Not found" });
    });
};

export default constructorMethod;
