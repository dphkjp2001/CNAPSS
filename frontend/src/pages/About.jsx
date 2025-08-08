import React from "react";

export default function About() {
  return (
    <div className="bg-blue-50 min-h-screen">
      {/* Hero */}
      <section className="bg-blue-100 py-16 text-center">
        <h1 className="text-5xl font-bold text-blue-800">What is CNAPSS?</h1>
        <p className="text-xl text-blue-700 mt-4">
          A smarter, social, and streamlined campus experience for U.S. students.
        </p>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-16">

        {/* Purpose */}
        <div className="bg-white shadow rounded-xl p-8">
          <h2 className="text-3xl font-bold mb-4 text-blue-800">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed">
            CNAPSS is designed to simplify your academic and social life. We help you:
          </p>
          <ul className="list-disc list-inside mt-4 text-gray-600 space-y-1">
            <li>Find & compare courses using real student feedback</li>
            <li>Manage & share your personal and group schedules</li>
            <li>Connect with classmates through comments & posts</li>
            <li>Meet friends from other schools or the same class</li>
          </ul>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: "Free Board",
              desc: "Casual space to post, comment, and connect with your school community."
            },
            {
              title: "Course Recs",
              desc: "Smart suggestions based on your school, major, and preferences."
            },
            {
              title: "Schedule Grid",
              desc: "Visual planner to organize and share your weekly timetable."
            },
            {
              title: "Friend System",
              desc: "Add friends, browse their schedules, and stay in sync."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white shadow-md rounded-xl p-6">
              <h3 className="text-xl font-semibold text-blue-700">{item.title}</h3>
              <p className="text-gray-600 mt-2">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Who We Are */}
        <div className="bg-white shadow rounded-xl p-8">
          <h2 className="text-3xl font-bold mb-4 text-blue-800">Who We Are</h2>
          <p className="text-gray-700">
            Built by NYU students for students nationwide. We understand your needs — because we're students too.
          </p>
          <p className="text-gray-700 mt-2">
            Our goal is to connect campuses while preserving each school's identity.
          </p>
          <p className="text-gray-700 mt-4">
            <strong>Developers:</strong> Choi Minhyoek, Park Dongjae
          </p>
        </div>

        {/* Contact */}
        <div className="bg-white shadow rounded-xl p-8 text-left">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">Contact</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Email: <a href="mailto:cmh@cnapss.com" className="text-blue-600 underline">cmh@cnapss.com</a></li>
            <li>Secure & private: SSL protected, no data resale</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
