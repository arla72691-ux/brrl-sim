import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Part1 from "./Part1";
import Part2 from "./Part2";
import Presenter from "./Presenter";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/part1" replace />} />
      <Route path="/part1" element={<Part1 />} />
      <Route path="/part2" element={<Part2 />} />
      <Route path="/presenter" element={<Presenter />} />
    </Routes>
  </BrowserRouter>
);
