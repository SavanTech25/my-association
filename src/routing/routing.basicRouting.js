

import React from "react";

import { Route, Routes } from "react-router-dom";
//import { useSelector } from "react-redux";
import Dashboard from "../views/Dashboard";


export default function BasicRouting() {

    //const user = useSelector((state)=> state.userReducer.user);

    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<Dashboard />} /> 
        </Routes>
    )
}

