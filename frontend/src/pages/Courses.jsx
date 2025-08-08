import React from "react"; 
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Courses() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">강의 추천</h2>
      <p>강의 추천 시스템이 여기에 들어갈 예정입니다.</p>
    </div>
  );
}

export default Courses;
