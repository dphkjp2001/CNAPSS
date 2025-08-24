// src/pages/market/MarketEdit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getItem, updateItem } from "../../api/market";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

const MAX_IMAGES = 3;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const MarketEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();
  const { user, token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const baseURL = import.meta.env.VITE_API_URL;

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
  });

  // images: [{ url, isCover?: boolean, uploading?: boolean }]
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const isValid = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.price || Number.isNaN(Number(form.price))) return false;
    if (Number(form.price) < 0) return false;
    return true;
  }, [form.title, form.price]);

  useEffect(() => {
    let mounted = true;
    const fetchItem = async () => {
      try {
        const data = await getItem({ school, token, id });

        if (data.seller !== user?.email) {
          alert("You don’t have permission to edit this listing.");
          navigate(schoolPath("/market"));
          return;
        }

        if (!mounted) return;
        setForm({
          title: data.title || "",
          description: data.description || "",
          price: String(data.price ?? ""),
        });
        const imgs = Array.isArray(data.images) ? data.images : [];
        setImages(imgs.map((u, idx) => ({ url: u, isCover: idx === 0 })));
      } catch (e) {
        console.error(e);
        alert("Failed to load the listing.");
        navigate(schoolPath("/market"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchItem();
    return () => {
      mounted = false;
    };
  }, [id, user, navigate, school, schoolPath, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceInput = (e) => {
    const cleaned = e.target.value.replace(/[^\d.]/g, "");
    setForm((prev) => ({ ...prev, price: cleaned }));
  };

  // instant upload & merge
  const handleFiles = async (fileList) => {
    const room = Math.max(0, MAX_IMAGES - images.length);
    const files = Array.from(fileList || []).slice(0, room);
    if (!files.length) return;

    // optimistic placeholders
    const placeholders = files.map((f) => ({
      url: URL.createObjectURL(f),
      uploading: true,
    }));
    setImages((prev) => [...prev, ...placeholders]);

    // upload sequentially
    for (let i = 0; i < files.length; i++) {
      try {
        const url = await uploadToCloudinary(files[i]);
        setImages((prev) => {
          const next = [...prev];
          const idx = next.findIndex((x) => x.uploading);
          if (idx !== -1) next[idx] = { url, uploading: false };
          return next;
        });
      } catch (e) {
        console.error("image upload failed", e);
        setImages((prev) => {
          const next = [...prev];
          const idx = next.findIndex((x) => x.uploading);
          if (idx !== -1) next.splice(idx, 1);
          return next;
        });
        setErr("Failed to upload one or more images.");
      }
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const setAsCover = (idx) => {
    setImages((prev) => {
      const next = prev.map((img, i) => ({ ...img, isCover: i === idx }));
      const [picked] = next.splice(idx, 1);
      next.unshift(picked);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || images.some((i) => i.uploading)) return;

    try {
      setLoading(true);
      setErr("");

      await updateItem({
               school,
               token,
               id,
               payload: {
                 title: form.title.trim(),
                 description: form.description.trim(),
                 price: parseFloat(form.price),
                 images: images.map((i) => i.url), // cover at index 0
               },
        });
      navigate(schoolPath(`/market/${id}`));
    } catch (e) {
      console.error(e);
      setErr("Failed to save changes. Please try again.");
      alert("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h1 className="text-xl font-bold text-gray-900">Edit Listing</h1>
            <p className="mt-1 text-sm text-gray-500">
              Update photos, title, price, and description. The first photo is used as the cover.
            </p>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
            {/* Photos */}
            <section>
              <label className="block text-sm font-medium text-gray-900">
                Photos <span className="font-normal text-gray-400">(up to {MAX_IMAGES})</span>
              </label>

              <div
                className="mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-6 text-center transition hover:bg-gray-50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (images.length >= MAX_IMAGES) return;
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <div className="text-3xl">🖼️</div>
                <p className="mt-2 text-sm text-gray-700">
                  Drag & drop images here, or{" "}
                  <label htmlFor="file-input" className="cursor-pointer font-medium text-gray-900 underline underline-offset-2">
                    browse
                  </label>
                </p>
                <p className="text-xs text-gray-500 mt-1">PNG/JPG, up to ~5MB each</p>
              </div>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="aspect-[4/3] bg-gray-50">
                        <img
                          src={img.url}
                          alt={`photo ${idx + 1}`}
                          className={`h-full w-full object-cover ${img.uploading ? "opacity-60" : ""}`}
                        />
                      </div>

                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setAsCover(idx)}
                          className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-gray-800 shadow hover:bg-white"
                        >
                          {idx === 0 ? "Cover" : "Set as cover"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-white"
                        >
                          Remove
                        </button>
                      </div>

                      {img.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-xs text-gray-700">
                          Uploading…
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Title & Price */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-900">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., iPad Air 64GB (Blue)"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Price</label>
                <div className="mt-2 flex items-center rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-gray-900/10">
                  <span className="mr-2 text-gray-500">$</span>
                  <input
                    name="price"
                    value={form.price}
                    onChange={handlePriceInput}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    required
                  />
                </div>
                {form.price && (
                  <p className="mt-1 text-xs text-gray-500">
                    {currency.format(Number(form.price) || 0)}
                  </p>
                )}
              </div>
            </section>

            {/* Description */}
            <section>
              <label className="block text-sm font-medium text-gray-900">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                placeholder="Add key details, usage, defects, pickup options, etc."
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                required
              />
            </section>

            {/* Error */}
            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || images.some((i) => i.uploading)}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


export default MarketEdit;