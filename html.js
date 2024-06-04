<html>
    <head>
        <title>Test Result</title>
    </head>
    <body>
        <div ref={pdfRef}>
            <div className="flex justify-between">
                <h1>Name : {singleUser?.name}</h1>
                <h1>Email : {singleUser?.email}</h1>
            </div>
            {/* table */}
            <div className="overflow-x-auto">
                <table className="table">
                    {/* head */}
                    <thead>
                        <tr>
                            <th>Booked No</th>
                            <th>User Name</th>
                            <th>Test Category</th>
                            <th>Test Date</th>
                            <th>Test Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* row 1 */}
                        {
                            UserTestBooked?.map((booked, idx) => <tr key={booked?._id} className={`${idx % 2 === 0 ? "bg-base-200" : ''}`}>
                                <th>{idx + 1}</th>
                                <td>{booked?.name}</td>
                                <td>{booked?.testCategory}</td>
                                <td>{new Date(booked?.date).toLocaleDateString()}</td>
                                <td>{booked?.price}</td>
                            </tr>)
                        }
                    </tbody>
                </table>
            </div>
        </div>
    </body>
</html>