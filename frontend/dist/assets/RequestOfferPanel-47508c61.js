import{c as d}from"./createLucideIcon-e5e30920.js";import{l as E,u as _,c as M,r as u,R as e}from"./index-0cb62dc1.js";/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]],j=d("book-open",N);/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=[["path",{d:"M12 6v6l4 2",key:"mmk7yg"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],D=d("clock",S);/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=[["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M14 2v2",key:"6buw04"}],["path",{d:"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",key:"pwadti"}],["path",{d:"M6 2v2",key:"colzsn"}]],L=d("coffee",I);/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]],O=d("ellipsis-vertical",$);/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",key:"j76jl0"}],["path",{d:"M22 10v6",key:"1lu8f3"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5",key:"1r8lef"}]],V=d("graduation-cap",R);async function q({school:a,targetId:o,message:s}){const c="https://api.cnapss.com/api".replace(/\/$/,"");return E(`${c}/${a}/request`,{method:"POST",headers:{"Content-Type":"application/json"},body:{targetId:o,initialMessage:s}})}function y({label:a,value:o,selected:s,onChange:c}){return e.createElement("label",{className:"flex items-center gap-3 cursor-pointer select-none"},e.createElement("input",{type:"radio",className:"h-4 w-4 accent-red-500",checked:s===o,onChange:()=>c(o)}),e.createElement("span",{className:"text-sm text-slate-700"},a))}function Y({school:a,postId:o,kind:s}){const c=_(),{user:v}=M(),r=s==="course_materials",i=s==="coffee_chat",l=s==="study_mate"||s==="study_group",g=`Hi,
I would love to study with you!
Let me know what days you are thinking of :)`,[n,m]=u.useState("lunch"),[h,k]=u.useState(""),f=u.useMemo(()=>l?g:r?`Hi,
I have the class materials you're looking for. You can get it for ${n==="lunch"?"lunch/dinner":n==="small"?"a small cost":"anything is fine"}.`:i?`Hi,
I can have a coffee chat with you for ${n==="lunch"?"lunch/dinner":n==="small"?"a small cost":"anything is fine"}.`:h||"",[r,i,l,h,n]),[p,x]=u.useState(!1),w=!!o&&!!a&&f.trim().length>0,C=async()=>{if(!v){alert("Please log in to send a message.");return}try{x(!0);const t=await q({school:a,targetId:o,message:l?g:f}),b=t==null?void 0:t.conversationId;c(b?`/${encodeURIComponent(a)}/messages?c=${encodeURIComponent(b)}`:`/${encodeURIComponent(a)}/messages`)}catch(t){alert((t==null?void 0:t.message)||"Failed to send.")}finally{x(!1)}};return e.createElement("aside",{className:"bg-white rounded-2xl shadow border border-slate-200 p-4 h-max"},e.createElement("div",{className:"text-sm text-slate-900 font-semibold mb-1"},"Hi,"),e.createElement("div",{className:"text-sm text-slate-700 mb-3"},r&&"I have the class materials you're looking for. You can get it for",i&&"I can have a coffee chat with you for",l&&"Send a request message:"),(r||i)&&e.createElement("div",{className:"space-y-3 mb-4"},e.createElement(y,{label:"lunch/dinner",value:"lunch",selected:n,onChange:m}),e.createElement(y,{label:"small cost",value:"small",selected:n,onChange:m}),e.createElement(y,{label:"Anything is fine",value:"free",selected:n,onChange:m})),!l&&!(r||i)&&e.createElement("textarea",{value:h,onChange:t=>k(t.target.value),rows:5,className:"w-full rounded-xl border border-slate-300 px-3 py-2 text-sm mb-4",placeholder:"Write a short message…"}),e.createElement("div",{className:"mb-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs whitespace-pre-wrap text-slate-700"},f),e.createElement("button",{onClick:C,disabled:p||!w,className:"w-full rounded-xl bg-red-500 text-white font-semibold py-2 shadow hover:bg-red-600 disabled:opacity-60"},l?p?"Sending…":"Send a request":p?"Sending…":"Send an offer"))}export{j as B,D as C,O as E,V as G,Y as R,L as a};
