import React from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../contexts/SchoolContext";

const schools = [
  { id: "nyu", name: "NYU", color: "bg-violet-600", hover: "hover:bg-violet-700" },
  { id: "columbia", name: "Columbia", color: "bg-sky-600", hover: "hover:bg-sky-700" },
  { id: "bu", name: "Boston", color: "bg-red-600", hover: "hover:bg-red-700" },
];

export default function SchoolSelect() {
  const { setSchool } = useSchool();
  const navigate = useNavigate();

  const handleSelect = (schoolId) => {
    setSchool(schoolId);
    navigate("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-8">Choose Your School</h1>
      <div className="flex space-x-4">
        {schools.map((school) => (
          <button
            key={school.id}
            onClick={() => handleSelect(school.id)}
            className={`${school.color} ${school.hover} text-white px-6 py-2 rounded-full font-medium transition`}
          >
            {school.name}
          </button>
        ))}
      </div>
    </div>
  );
}
