import { useContext, useEffect, useMemo, useRef, useState, createContext } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Facebook, Instagram, Linkedin, Loader2, Search, Twitter, X, Youtube } from "lucide-react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import "@/App.css";
import { initSmoothScroll, smoothScrollTo, startSmoothScroll, stopSmoothScroll } from "@/lib/smoothScroll";

const IMG = "https://images.unsplash.com/";
const img = (id, w = 1600) => `${IMG}${id}?auto=format&fit=crop&w=${w}&q=80`;

const segments = [
  { slug: "interior-designing", name: "INTERIOR DESIGNING", parent: "BDS Marvel", kicker: "Concept to detail", tone: "sage", tagline: "Design that decides before the build begins.", body: "End-to-end interior designing — concept, spatial planning, material palettes and detailing — resolved with our own stone, flooring and construction teams before a single wall is touched.", hero: "photo-1631679706909-1844bbd07221", services: ["Concept & Moodboards", "Space Planning", "Material Palettes", "3D Visualisation"], team: ["Principal designers", "Visualisation studio", "Procurement desk"] },
  { slug: "construction", name: "CONSTRUCTION", parent: "Formwork", kicker: "Turnkey execution", tone: "charcoal", tagline: "Buildings built the way the material wants to be used.", body: "Full-scope construction with a material-first sensibility — foundation, structure, finishes and site management for residential, hospitality and commercial builds.", hero: "photo-1503387762-592deb58ef4e", services: ["Civil Structure", "Finishing", "MEP Coordination", "Site Management"], team: ["Project directors", "Site engineers", "MEP consultants"] },
  { slug: "marble-and-stone", name: "MARBLE & STONE", parent: "Drawstones", kicker: "Interior stone", tone: "sand", tagline: "Stone that carries the building's silhouette.", body: "Facade and face stone for structures that need to age well. Interior stone — tables, fountains, decorative work — cut and finished in our own workshops.", hero: "photo-1618221195710-dd6b41faaea6", services: ["Facade Stone", "Face Stone", "Marble Slabs", "Decorative Stone"], team: ["Sourcing — Western India quarries", "Fabrication — Kishangarh workshop", "Installation — In-house crew"] },
  { slug: "flooring", name: "FLOORING", parent: "Renest", kicker: "Distribution + Proprietary", tone: "bronze", tagline: "Flooring, specified for how a space is actually lived in.", body: "Contract flooring for residential, hospitality and commercial projects — a distributed range and a proprietary line built for high-traffic floors.", hero: "photo-1616486338812-3dadae4b4ace", services: ["Wooden Plank", "Vinyl / SPC", "Stone Composite", "Sports & Contract"], team: ["Specification support", "Warehousing — Delhi NCR", "Installation partners"] },
  { slug: "interiors", name: "INTERIOR DECOR", parent: "Vignette", kicker: "Design + Build", tone: "terracotta", tagline: "Interiors that don't stop at the finishes.", body: "Residential and commercial interior design and execution — spatial planning, custom furniture, materials, lighting, installation.", hero: "photo-1600585154340-be6161a56a0c", services: ["Residential", "Hospitality", "Retail", "Bespoke Furniture"], team: ["Design leads", "Project executioners", "Craft partners"] },
];

const livingStudio = {
  name: "Air BnB Living Studio",
  kicker: "Stayable showroom",
  tagline: "Not a showroom — a home we built ourselves.",
  body: "The BDSM Living Studio is a guesthouse we built ourselves, with our own stone, flooring, finishes and furniture. Stay the night, live with every surface and plan your project from inside a working home.",
  hero: "photo-1600607687939-ce8a6c25118c",
  details: ["Three suites", "Material library", "Hosted walkthroughs"],
};

const stays = [
  // Premium — experience our work first-hand
  { slug: "living-studio", tier: "Premium", name: "The Living Studio", location: "Alibaug, Maharashtra", price: "₹28,000", guests: 6, bedrooms: 3, hero: "photo-1600607687939-ce8a6c25118c", blurb: "Our flagship stayable showroom — every surface is our own work.", description: "The premium way to experience BDS Marvel: a full guesthouse built end-to-end with our own stone, flooring, finishes and furniture. Stay the night, host your architect over breakfast, walk the materials library with our consultant and specify your project from inside a working reference.", amenities: ["Three ensuite suites", "Hosted materials walkthrough", "Private garden + sunken lounge", "Full breakfast & chef on request", "Sample library access", "Airport transfer on request"] },
  { slug: "stone-pavilion", tier: "Premium", name: "The Stone Pavilion", location: "Lonavala, Maharashtra", price: "₹32,000", guests: 8, bedrooms: 4, hero: "photo-1747258818911-dfde27ecabba", blurb: "A pavilion of glass and our own basalt, wrapped around a reflecting pool.", description: "Four suites arranged around a still reflecting pool, every wall in basalt we cut ourselves. Evenings on the water court, mornings in the sauna — the full BDS Marvel material palette at its most resolved.", amenities: ["Four pool-facing suites", "Private sauna & plunge", "Chef-led dinners", "Materials walkthrough", "Bonfire court", "Driver on call"] },
  { slug: "marble-house", tier: "Premium", name: "The Marble House", location: "Udaipur, Rajasthan", price: "₹30,000", guests: 6, bedrooms: 3, hero: "photo-1729605412224-147d072d3667", blurb: "Lake-facing suites in book-matched marble, ten minutes from the old city.", description: "A lake-facing residence where every bathroom is book-matched marble from our Kishangarh workshop. Sunset terraces, a butler pantry and quiet, cool rooms that show what stone does to light.", amenities: ["Three lake-view suites", "Book-matched marble baths", "Sunset terrace", "Butler pantry", "City walkthroughs on request"] },
  { slug: "verandah-suite", tier: "Premium", name: "The Verandah Suite", location: "Assagao, Goa", price: "₹24,000", guests: 4, bedrooms: 2, hero: "photo-1663811396672-83dd3f32f312", blurb: "A shaded laterite verandah, a plunge pool and nothing to prove.", description: "Our Goan outpost: laterite walls, a deep shaded verandah and a plunge pool under the trees. Two suites, an outdoor kitchen and the quietest version of our material palette.", amenities: ["Two garden suites", "Laterite verandah", "Plunge pool", "Outdoor kitchen", "Scooter on request"] },
  { slug: "atelier-penthouse", tier: "Premium", name: "The BDS Penthouse", location: "Bandra, Mumbai", price: "₹36,000", guests: 6, bedrooms: 3, hero: "photo-1756906838752-0b514ab37479", blurb: "Our city showcase — a split-level penthouse over the sea link skyline.", description: "The city flagship: a split-level penthouse with a double-height stone wall, terrazzo stair and a screening lounge. Host your project team, walk the flat with our designers and leave with a spec sheet.", amenities: ["Three skyline suites", "Double-height stone wall", "Screening lounge", "Design consult included", "Valet & chef on request"] },
  // Mid — design comfort, city ease
  { slug: "material-loft", tier: "Mid", name: "The Material Loft", location: "Jaipur, Rajasthan", price: "₹12,500", guests: 4, bedrooms: 2, hero: "photo-1737467030068-88ad20e617ca", blurb: "A warm city loft finished in our stone and oak — design comfort without the ceremony.", description: "A two-bedroom city loft for travellers who want to live with good material without the full showroom programme. Oak plank floors, honed stone counters and hand-finished lime walls — the same spec we install for clients, at an easy nightly rate.", amenities: ["Two queen bedrooms", "Full kitchen in honed stone", "Work nook with fibre wifi", "Self check-in", "Breakfast basket on request"] },
  { slug: "oak-apartment", tier: "Mid", name: "The Oak Apartment", location: "Pune, Maharashtra", price: "₹10,500", guests: 4, bedrooms: 2, hero: "photo-1789381500057-2a288d79e9e6", blurb: "Wall-to-wall oak, soft light and a proper work table.", description: "A calm two-bedroom apartment panelled in our engineered oak, with a long work table for travelling teams and a kitchen that invites slow mornings.", amenities: ["Two bedrooms", "Engineered oak throughout", "Dedicated work table", "Full kitchen", "Self check-in"] },
  { slug: "kota-flat", tier: "Mid", name: "The Kota Flat", location: "New Delhi", price: "₹9,800", guests: 3, bedrooms: 1, hero: "photo-1661796428175-55423b19409f", blurb: "A sunlit one-bed on Kota stone floors, minutes from the metro.", description: "A bright one-bedroom flat that shows off what humble Kota stone can do — cool floors, warm textiles, a reading corner and an easy commute to anywhere in the city.", amenities: ["One sunny bedroom", "Kota stone floors", "Reading corner", "Kitchenette", "Metro 5 min walk"] },
  { slug: "terrace-rooms", tier: "Mid", name: "The Terrace Rooms", location: "Bengaluru, Karnataka", price: "₹11,200", guests: 4, bedrooms: 2, hero: "photo-1781249144129-4ba0869707f5", blurb: "Two rooms, one big planted terrace, evening breeze included.", description: "A two-bedroom stay built around its planted terrace — outdoor dining for six, warm wood interiors and blackout shutters for proper sleep after long site days.", amenities: ["Two bedrooms", "Planted dining terrace", "Outdoor seating for six", "Blackout shutters", "Self check-in"] },
  { slug: "weavers-stay", tier: "Mid", name: "The Weaver's Stay", location: "Ahmedabad, Gujarat", price: "₹9,500", guests: 3, bedrooms: 1, hero: "photo-1781249144056-ec397e444dfa", blurb: "Textiles, lime plaster and a courtyard cafe downstairs.", description: "A one-bedroom stay above a courtyard cafe in the old textile district — lime plaster walls, handloom throws and our stone in the bath. Quiet, central, easy.", amenities: ["One bedroom + daybed", "Lime plaster & handloom", "Courtyard cafe below", "Stone-clad bath", "Self check-in"] },
  // Budget-friendly — honest rooms, honest prices
  { slug: "courtyard-room", tier: "Budget-friendly", name: "The Courtyard Room", location: "Kishangarh, Rajasthan", price: "₹5,800", guests: 2, bedrooms: 1, hero: "photo-1576354302919-96748cb8299e", blurb: "A simple, honest room beside our workshop — stone underfoot, sun in the courtyard.", description: "Our budget-friendly stay: a quiet, light-filled room next to the Kishangarh workshop. Honest materials, a proper bed, a shaded courtyard and chai from the studio kitchen. Perfect for a night between site visits — or your first look at what we make.", amenities: ["Queen bed, ensuite bath", "Shaded shared courtyard", "Studio chai & breakfast", "Workshop viewing on request", "Self check-in"] },
  { slug: "studio-nook", tier: "Budget-friendly", name: "The Studio Nook", location: "Ajmer, Rajasthan", price: "₹3,900", guests: 2, bedrooms: 1, hero: "photo-1759264244726-adde4e4318fc", blurb: "A neat little room five minutes from the dargah road.", description: "The simplest stay we make: a crisp bed, a writing desk, a hot shower and morning sun. Everything you need between trains, site visits and long drives.", amenities: ["Queen bed", "Writing desk", "Hot rain shower", "Morning chai", "Self check-in"] },
  { slug: "workshop-room", tier: "Budget-friendly", name: "The Workshop Room", location: "Kishangarh, Rajasthan", price: "₹4,200", guests: 2, bedrooms: 1, hero: "photo-1759264244746-140bbbc54e1b", blurb: "Fall asleep to the smell of cut stone — a room inside our workshop compound.", description: "A snug room inside the workshop compound for people who want to wake up where the material is made. Early morning cutting demos if you ask nicely.", amenities: ["Queen bed, ensuite", "Inside the workshop compound", "Cutting demos on request", "Studio breakfast", "Self check-in"] },
  { slug: "sunroom", tier: "Budget-friendly", name: "The Sunroom", location: "Pushkar, Rajasthan", price: "₹4,600", guests: 2, bedrooms: 1, hero: "photo-1781004667187-d1f862f8fa0b", blurb: "A glass-cornered room that catches the desert morning.", description: "A corner room wrapped in glass on two sides, five minutes from the lake ghats. Sunrise does the decorating; we did the stone floor and the very good mattress.", amenities: ["Glass corner room", "Stone floor", "Lake ghats 5 min", "Rooftop chai", "Self check-in"] },
  { slug: "lime-wash-room", tier: "Budget-friendly", name: "The Lime Wash Room", location: "Jaipur, Rajasthan", price: "₹4,900", guests: 2, bedrooms: 1, hero: "photo-1780399334790-64af9ffb45fc", blurb: "Hand-trowelled lime walls and a deep, dark night's sleep.", description: "A cocoon of hand-trowelled lime plaster in the old city — cool in summer, warm at night, with a tiny balcony for evening chai. Our cheapest night, and many guests' favourite.", amenities: ["Queen bed", "Hand-trowelled lime walls", "Chai balcony", "Old-city location", "Self check-in"] },
];

const stayTiers = [
  { slug: "premium", name: "Premium", headline: "Experience our work, first-hand.", copy: "Full homes built end-to-end with our own stone, floors and furniture — hosted walkthroughs, chef breakfasts and the materials library. Live in the reference before you specify it." },
  { slug: "mid", name: "Mid", headline: "Design comfort, city ease.", copy: "Finished apartments wearing our oak, stone and lime — work tables, good kitchens, self check-in and easy nightly rates." },
  { slug: "budget-friendly", name: "Budget-friendly", headline: "Honest rooms, honest prices.", copy: "Simple, light-filled rooms near our workshops and the old cities — the essentials done properly, from ₹3,900 a night." },
];

const tierSlugOf = (tierName) => stayTiers.find((tier) => tier.name === tierName)?.slug || "premium";

const approach = [
  { number: "01", title: "MATERIAL FIRST", image: "photo-1618221195710-dd6b41faaea6", text: "Every project begins with the stone or the surface. Specification precedes drawings so the material never has to bend to fit the design." },
  { number: "02", title: "ONE TEAM", image: "photo-1600585154340-be6161a56a0c", text: "Materials, flooring, construction and interiors under one roof. One accountable team from the spec sheet to the snag list." },
  { number: "03", title: "EDITORIAL DETAIL", image: "photo-1616486338812-3dadae4b4ace", text: "Architectural minimalism, hospitality warmth. Joints, thresholds and reveals resolved with the same care as the elevation." },
  { number: "04", title: "HERITAGE + CRAFT", image: "photo-1503387762-592deb58ef4e", text: "Traditional cutting and finishing techniques paired with modern engineering. Craftspeople we have worked with for two decades." },
  { number: "05", title: "EXPERIENCE-LED", image: "photo-1600607687939-ce8a6c25118c", text: "Don't just see the materials — live in them. The BDSM Living Studio is our showroom you can actually stay in." },
];

// Four stone tones shared with the network segments — purposes rotate through them
const purposeTones = ["sand", "bronze", "charcoal", "terracotta"];

const clients = [
  { name: "L&T — LNT Pvt Ltd", logo: "/clients/lnt.png" },
  { name: "Mangalam Organics", logo: "/clients/mangalam.png" },
  { name: "The Lalit", logo: "/clients/lalit.png" },
  { name: "ITC Hotels", logo: "/clients/itc.png" },
  { name: "Boutique Hotels", logo: "/clients/boutique.png" },
  { name: "Clarks Amer", logo: "/clients/clarks-amer.png" },
  { name: "NHAI", logo: "/clients/nhai.png" },
  { name: "Kshetrapal Hospital Ajmer", logo: "/clients/kshetrapal.png" },
  { name: "Mewar Estate Ajmer", logo: "/clients/mewar-estate.png" },
  { name: "JLN Hospital Ajmer", logo: "/clients/jln.png" },
  { name: "MPS School Ajmer", logo: "/clients/mps.png" },
  { name: "DWPS Ajmer", logo: "/clients/dwps.png" },
  { name: "Mayo College Ajmer", logo: "/clients/mayo.png" },
  { name: "Taj Pratap Mahal Ajmer", logo: "/clients/taj.png" },
  { name: "JSB Kishangarh", logo: "/clients/jsb.png" },
  { name: "AKV Kishangarh", logo: "/clients/akv.png" },
  { name: "Bhutra Marble Kishangarh", logo: "/clients/bhutra.png" },
  { name: "CBSE Ajmer", logo: "/clients/cbse.png" },
  { name: "RBSE Ajmer", logo: "/clients/rbse.png" },
  { name: "Income Tax Department Ajmer", logo: "/clients/income-tax.png" },
  { name: "Army Cantt", logo: "/clients/army-cantt.png" },
  { name: "Ramada Ajmer", logo: "/clients/ramada.png" },
  { name: "Satguru Group Ajmer", logo: "/clients/satguru.png" },
  { name: "Marriott", logo: "/clients/marriott.png" },
];

const projects = [
  { slug: "meridian-residences", title: "Meridian Residences", segment: "MARBLE & STONE", category: "Residential", image: "photo-1600585154340-be6161a56a0c", gallery: ["photo-1600585154340-be6161a56a0c", "photo-1618221195710-dd6b41faaea6", "photo-1616486338812-3dadae4b4ace"], year: "2024", location: "Alibaug, Maharashtra", description: "Twelve seafront villas clad in a custom facade stone quarried, cut and installed end-to-end.", challenge: "The facade needed to weather the salt air without turning grey.", approach: "We specified a dense sandstone with a low porosity and honed it to bring the warm undertones forward.", outcomes: [["12", "villas delivered"], ["18 mo", "site to handover"], ["100%", "material in-house"]], credits: ["Drawstones — Facade & Interior Stone", "Formwork — Civil & Finishing", "Architect — External partner"] },
  { slug: "kabbon-lounge", title: "Kabbon Lounge", segment: "INTERIOR DECOR", category: "Hospitality", image: "photo-1600607687939-ce8a6c25118c", gallery: ["photo-1600607687939-ce8a6c25118c", "photo-1600566753190-17f0baa2a6c3", "photo-1616486338812-3dadae4b4ace"], year: "2024", location: "Bengaluru, Karnataka", description: "A 90-cover restaurant designed around a single travertine bar block.", challenge: "The client wanted the room to feel monolithic without becoming cold.", approach: "One stone, three finishes — a polished bar top, honed cladding, split-face walls. Warm oak floors soften everything else.", outcomes: [["1", "material palette"], ["4 mo", "design to open"], ["120 sqm", "of stone specified"]], credits: ["Vignette — Concept & Execution", "Drawstones — Travertine sourcing", "Formwork — Fit-out"] },
  { slug: "veda-clubhouse", title: "Veda Clubhouse", segment: "CONSTRUCTION", category: "Amenity", image: "photo-1600566753190-17f0baa2a6c3", gallery: ["photo-1600566753190-17f0baa2a6c3", "photo-1618221195710-dd6b41faaea6", "photo-1600585154340-be6161a56a0c"], year: "2023", location: "Pune, Maharashtra", description: "A residential clubhouse — pool, gym, event spaces — built as one continuous stone ribbon.", challenge: "Every wall inside and out had to read as the same material.", approach: "We wrapped the volume in a Kota-limestone rain screen and continued the same stone through the pool coping and lobby floor.", outcomes: [["2,400 sqm", "built-up"], ["3", "levels"], ["14 mo", "structure to soft launch"]], credits: ["Formwork — Structure & Finishing", "Drawstones — Kota supply", "Renest — Pool decking"] },
  { slug: "annex-workspace", title: "Annex Workspace", segment: "FLOORING", category: "Commercial", image: "photo-1616486338812-3dadae4b4ace", gallery: ["photo-1616486338812-3dadae4b4ace", "photo-1600607687939-ce8a6c25118c", "photo-1503387762-592deb58ef4e"], year: "2023", location: "Gurugram, Haryana", description: "40,000 sqft of workspace flooring across three floors, delivered in a six-week window.", challenge: "A hospitality-grade floor that could take a corporate footfall.", approach: "Contract-grade SPC in two warm tones, pre-cut off-site so installation ran cleanly.", outcomes: [["40,000 sqft", "installed"], ["6 wk", "on site"], ["0", "post-handover claims"]], credits: ["Renest — Specification & Installation", "Formwork — Sub-structure"] },
  { slug: "atrium-mall", title: "Atrium Mall", segment: "MARBLE & STONE", category: "Commercial", image: "photo-1503387762-592deb58ef4e", gallery: ["photo-1503387762-592deb58ef4e", "photo-1600585154340-be6161a56a0c", "photo-1618221195710-dd6b41faaea6"], year: "2022", location: "Jaipur, Rajasthan", description: "Retail atrium with a book-matched onyx feature wall and a full-marble concourse.", challenge: "Matching stone across 45 running metres of feature wall.", approach: "We sourced two adjacent onyx blocks, cut them ourselves, and book-matched every panel before shipping.", outcomes: [["45 m", "book-matched wall"], ["3,600 sqm", "concourse marble"], ["1", "onyx block, split"]], credits: ["Drawstones — Sourcing, cutting, installation", "Formwork — Substrate & wall build"] },
  { slug: "shore-villa", title: "Shore Villa", segment: "INTERIOR DECOR", category: "Residential", image: "photo-1618221195710-dd6b41faaea6", gallery: ["photo-1618221195710-dd6b41faaea6", "photo-1600585154340-be6161a56a0c", "photo-1616486338812-3dadae4b4ace"], year: "2024", location: "Goa", description: "A four-bedroom villa where every fixed surface is stone.", challenge: "Keep a heavy-material palette from feeling like a museum.", approach: "Three warm marbles, natural lime plaster, oak floors and light linen textiles. Nothing else.", outcomes: [["4", "bedrooms"], ["3", "stones"], ["9 mo", "design to move-in"]], credits: ["Vignette — Full scope", "Drawstones — Kitchen, bath, feature wall", "Renest — Oak plank"] },
  { slug: "civic-facade", title: "Civic Facade", segment: "MARBLE & STONE", category: "Institutional", image: "photo-1580587771525-78b9dba3b914", gallery: ["photo-1580587771525-78b9dba3b914", "photo-1600585154340-be6161a56a0c", "photo-1618221195710-dd6b41faaea6"], year: "2022", location: "Ahmedabad, Gujarat", description: "A civic building facade in flame-finished granite installed as a dry-cladding system.", challenge: "A facade that would read cleanly at scale and stay clean over the years.", approach: "Self-cleaning flame finish, a 4mm shadow gap and a sub-frame built to hold thermal movement.", outcomes: [["1,850 sqm", "facade"], ["4mm", "reveal, everywhere"], ["7", "elevations resolved"]], credits: ["Drawstones — Supply & installation", "Formwork — Sub-frame & envelope"] },
  { slug: "kiln-restaurant", title: "Kiln Restaurant", segment: "CONSTRUCTION", category: "Hospitality", image: "photo-1600566753190-17f0baa2a6c3", gallery: ["photo-1600566753190-17f0baa2a6c3", "photo-1600607687939-ce8a6c25118c", "photo-1503387762-592deb58ef4e"], year: "2023", location: "Mumbai, Maharashtra", description: "A 3,200 sqft restaurant built around an exposed brick and stone kiln.", challenge: "Structural rework to expose the kiln without losing the load path.", approach: "We ran a new steel transfer above the kiln and let the original masonry become the room.", outcomes: [["1", "kiln, exposed"], ["3,200 sqft", "fit-out"], ["5 mo", "shell to open"]], credits: ["Formwork — Structural, shell & core", "Vignette — Design & Fit-out", "Drawstones — Bar & floor stone"] },
  { slug: "lumen-apartment", title: "Lumen Apartment", segment: "INTERIOR DESIGNING", category: "Residential", image: "photo-1631679706909-1844bbd07221", gallery: ["photo-1631679706909-1844bbd07221", "photo-1618220179428-22790b461013", "photo-1600585154340-be6161a56a0c"], year: "2024", location: "Bengaluru, Karnataka", description: "A full interior-designing brief for a light-first city apartment, resolved end-to-end before a single wall moved.", challenge: "A dark, compartmentalised flat that needed to feel open without losing storage.", approach: "We redrew the plan around a single daylight axis, set a warm neutral palette and detailed every joinery run in 3D before build.", outcomes: [["1,650 sqft", "reimagined"], ["3D", "sign-off before build"], ["6 wk", "concept to drawings"]], credits: ["BDS Marvel — Concept, planning & detailing", "Renest — Oak flooring", "Formwork — Fit-out"] },
  { slug: "sable-studio-office", title: "Sable Studio Office", segment: "INTERIOR DESIGNING", category: "Commercial", image: "photo-1618220179428-22790b461013", gallery: ["photo-1618220179428-22790b461013", "photo-1631679706909-1844bbd07221", "photo-1616486338812-3dadae4b4ace"], year: "2023", location: "Jaipur, Rajasthan", description: "Interior designing for a creative studio — spatial planning, material palette and lighting concept delivered as one scheme.", challenge: "Give a 20-person studio focus zones and social zones inside one open floor.", approach: "Zoning by material and light: honed stone at the core, warm oak at the edges, layered task and ambient lighting throughout.", outcomes: [["20", "person studio"], ["4", "material palette"], ["5 mo", "design to move-in"]], credits: ["BDS Marvel — Full interior-design scope", "Drawstones — Core stone", "Renest — Oak & contract flooring"] },
];

const catalogueItems = [
  { slug: "beige-honed", name: "Beige Honed Slab", material: "Marble", product: "Slab", application: "Interior", image: "photo-1618221195710-dd6b41faaea6", origin: "Rajasthan" },
  { slug: "kota-flame", name: "Kota Flame Facade", material: "Stone", product: "Facade", application: "Exterior", image: "photo-1580587771525-78b9dba3b914", origin: "Kota" },
  { slug: "onyx-book", name: "Book-matched Onyx", material: "Onyx", product: "Slab", application: "Commercial", image: "photo-1503387762-592deb58ef4e", origin: "Iran via workshop" },
  { slug: "travertine-bar", name: "Travertine Bar Block", material: "Travertine", product: "Table", application: "Hospitality", image: "photo-1600607687939-ce8a6c25118c", origin: "Italy" },
  { slug: "stone-fountain", name: "Cascade Stone Fountain", material: "Stone", product: "Fountain", application: "Exterior", image: "photo-1600566753190-17f0baa2a6c3", origin: "In-house workshop" },
  { slug: "marble-fountain", name: "Basin Marble Fountain", material: "Marble", product: "Fountain", application: "Interior", image: "photo-1600585154340-be6161a56a0c", origin: "In-house workshop" },
  { slug: "spc-contract", name: "SPC Contract Plank", material: "Flooring", product: "Flooring", application: "Commercial", image: "photo-1616486338812-3dadae4b4ace", origin: "Proprietary line" },
  { slug: "oak-hospitality", name: "Oak Plank — Hospitality", material: "Flooring", product: "Flooring", application: "Hospitality", image: "photo-1600607687939-ce8a6c25118c", origin: "Distributed line" },
  { slug: "console-table", name: "Console Table — Nero", material: "Marble", product: "Table", application: "Residential", image: "photo-1600585154340-be6161a56a0c", origin: "BDS workshop" },
  { slug: "decorative-vessel", name: "Turned Stone Vessel", material: "Stone", product: "Decorative", application: "Interior", image: "photo-1618221195710-dd6b41faaea6", origin: "BDS workshop" },
  { slug: "custom-vanity", name: "Custom Marble Vanity", material: "Marble", product: "Furniture", application: "Residential", image: "photo-1600566753190-17f0baa2a6c3", origin: "BDS workshop" },
  { slug: "onyx-lamp", name: "Backlit Onyx Panel", material: "Onyx", product: "Decorative", application: "Commercial", image: "photo-1503387762-592deb58ef4e", origin: "BDS workshop" },
];

const materialsFilter = ["All", "Marble", "Stone", "Onyx", "Travertine", "Flooring"];
const productsFilter = ["All", "Slab", "Facade", "Fountain", "Table", "Furniture", "Decorative", "Flooring"];
const applicationsFilter = ["All", "Interior", "Exterior", "Residential", "Commercial", "Hospitality"];

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { node.classList.add("is-visible"); observer.disconnect(); } }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "" }) { return <div ref={useReveal()} className={`reveal ${className}`}>{children}</div>; }

function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title;
    const set = (selector, value) => { const tag = document.querySelector(selector); if (tag) tag.setAttribute("content", value); };
    set('meta[name="description"]', description);
    set('meta[property="og:title"]', title);
    set('meta[property="og:description"]', description);
  }, [title, description]);
}

const SEGMENT_SEO = {
  "interior-designing": ["Interior Designing — BDS Marvel | BDSM · BDS Marvel", "BDS Marvel, the interior designing team at BDSM: concept, spatial planning, material palettes and detailing for residential and commercial spaces."],
  "marble-and-stone": ["Marble & Stone Supplier in India — Drawstones | BDSM · BDS Marvel", "Drawstones, the stone team at BDSM · BDS Marvel: marble, granite, kota and travertine sourcing, cutting and installation for facades and interiors."],
  flooring: ["SPC & Wood Flooring — Renest | BDSM · BDS Marvel", "Renest, the flooring team at BDSM · BDS Marvel: SPC, engineered oak and hospitality-grade flooring, specified and installed by one in-house team."],
  construction: ["Turnkey Construction — Formwork | BDSM · BDS Marvel", "Formwork, the construction team at BDSM · BDS Marvel: turnkey structures, fitouts and site execution under one contract."],
  interiors: ["Interior Design & Build — Vignette | BDSM · BDS Marvel", "Vignette, the interior design team at BDSM · BDS Marvel: residential and commercial interiors, bespoke furniture and full execution."],
};

function useOrbitScroll() {
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      document.documentElement.style.setProperty("--orbit-a", `${y * 0.06}deg`);
      document.documentElement.style.setProperty("--orbit-b", `${y * -0.09}deg`);
      document.documentElement.style.setProperty("--orbit-c", `${y * 0.14}deg`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

function highlightSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("section-arrived");
  void el.offsetWidth;
  el.classList.add("section-arrived");
  window.setTimeout(() => el.classList.remove("section-arrived"), 1600);
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 40); window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    const onKeyDown = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);
  const goHomeSection = (id) => { setMenuOpen(false); navigate("/"); window.setTimeout(() => smoothScrollTo(document.getElementById(id)), 80); };
  return <>
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""} ${menuOpen ? "site-header--menu-open" : ""}`} data-testid="site-header">
      <button type="button" className="wordmark" onClick={() => goHomeSection("top")} data-testid="home-logo-button" aria-label="Go to top">BDSM</button>
      <div className="header-right">
        <Link className="header-work-link" to="/projects" data-testid="header-work-link">PROJECTS</Link>
        <Link className="header-work-link" to="/catalogue" data-testid="header-catalogue-link">CATALOGUE</Link>
        <Link className="header-work-link" to="/contact" data-testid="header-contact-link">CONTACT</Link>
        <button type="button" className={`menu-button ${menuOpen ? "menu-button--open" : ""}`} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="site-navigation-drawer" aria-label={menuOpen ? "Close menu" : "Open menu"} data-testid="open-menu-button"><span className="menu-icon" aria-hidden="true"><span></span><span></span></span></button>
      </div>
    </header>
    <div id="site-navigation-drawer" className={`menu-drawer ${menuOpen ? "menu-drawer--open" : ""}`} role="dialog" aria-modal="true" aria-label="Site navigation" data-testid="navigation-drawer" aria-hidden={!menuOpen}>
      <button type="button" className="drawer-close" onClick={() => setMenuOpen(false)} data-testid="close-menu-button" aria-label="Close menu"><X size={28} /></button>
      <div className="drawer-copy"><span className="eyebrow">BDSM · BDS MARVEL</span><h2>Materials, structures<br /><em>and the space between.</em></h2></div>
      <nav className="drawer-nav" data-testid="navigation-menu">
        <button onClick={() => goHomeSection("top")} data-testid="nav-home-link"><span>01</span>HOME</button>
        <Link to="/about" onClick={() => setMenuOpen(false)} data-testid="nav-about-link"><span>02</span>ABOUT</Link>
        <button onClick={() => goHomeSection("network")} data-testid="nav-network-link"><span>03</span>WHAT WE DO</button>
        <Link to="/projects" onClick={() => setMenuOpen(false)} data-testid="nav-work-link"><span>04</span>PROJECTS</Link>
        <Link to="/catalogue" onClick={() => setMenuOpen(false)} data-testid="nav-catalogue-link"><span>05</span>CATALOGUE</Link>
        <Link to="/experience" onClick={() => setMenuOpen(false)} data-testid="nav-experience-link"><span>06</span>AIR BNB</Link>
        <Link to="/contact" onClick={() => setMenuOpen(false)} data-testid="nav-contact-link"><span>07</span>CONTACT</Link>
      </nav>
      <div className="drawer-footer" data-testid="navigation-drawer-footer">INFO.BDSMARVEL@GMAIL.COM <span>© BDSM · BDS MARVEL</span></div>
    </div>
  </>;
}

function Home() {
  usePageMeta("BDSM · BDS Marvel | Marble & Stone, Flooring, Construction & Interiors", "One design and build studio for marble and stone, flooring, turnkey construction and interior design — workshops and studios across India: Kishangarh, Mumbai, Gurugram, Pune, New Delhi and Goa.");
  const [activeApproach, setActiveApproach] = useState(0);
  useOrbitScroll();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const ringsY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const ringsRotate = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const ringsScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const onHeroTilt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
  };
  const resetHeroTilt = (event) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };
  const scrollTo = (id) => smoothScrollTo(document.getElementById(id));
  return <main className="zoo-site">
    <section className="hero" id="top" data-testid="hero-section" ref={heroRef} onMouseMove={onHeroTilt} onMouseLeave={resetHeroTilt}>      <motion.div className="hero-headline-parallax" style={{ y: headlineY }}>
        <div className="hero-heading"><p className="eyebrow">BDSM · BDS MARVEL</p><h1><span className="hero-line"><span className="hero-line__inner">Architecture.</span></span><span className="hero-line"><span className="hero-line__inner"><em>Interiors.</em></span></span><span className="hero-line"><span className="hero-line__inner">Everything In Between<span className="hero-dot">.</span></span></span></h1></div>
      </motion.div>
      <div className="hero-footer"><button onClick={() => scrollTo("network")} data-testid="hero-explore-button">EXPLORE OUR WORK <ArrowDown size={16} /></button></div>
      <motion.div className="hero-rings-parallax" style={{ y: ringsY, rotate: ringsRotate, scale: ringsScale }} aria-hidden="true" data-testid="hero-rings-parallax">
        <div className="hero-rings-tilt">
          <div className="hero-rings" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </motion.div>
    </section>
    <NetworkExperience />
    <ExperienceSpotlight />
    <section className="purpose-section" id="purpose" data-testid="purpose-section">
      <Reveal className="purpose-header"><span className="section-index">02 — HOW BDS MARVEL BUILDS</span><h2>Built around<br /><em>the material.</em></h2></Reveal>
      <div className="purpose-layout">
        <div className="purpose-list">{approach.map((purpose, index) => <div className={`purpose-accordion-item ${activeApproach === index ? "purpose-accordion-item--active" : ""}`} key={purpose.title} data-testid={`purpose-accordion-item-${index + 1}`}>
          <button className={`purpose-tab purpose-tab--tone-${purposeTones[index % 4]} ${activeApproach === index ? "purpose-tab--active" : ""}`} onClick={() => setActiveApproach(index)} aria-expanded={activeApproach === index} aria-controls={`purpose-mobile-panel-${index + 1}`} data-testid={`purpose-tab-${index + 1}`}><span>{purpose.number}</span><strong>{purpose.title}</strong><ChevronDown size={19} /></button>
          <div className="purpose-accordion-panel" id={`purpose-mobile-panel-${index + 1}`} aria-hidden={activeApproach !== index} data-testid={`purpose-mobile-panel-${index + 1}`}>
            <div className="purpose-accordion-panel__inner">
              <div className={`purpose-feature purpose-feature--mobile purpose-feature--tone-${purposeTones[index % 4]}`} style={{ backgroundImage: `linear-gradient(90deg, rgba(8,8,8,.82), rgba(8,8,8,.08)), url(${img(purpose.image)})` }}>
                <div><span>{purpose.number} / 05</span><h3>{purpose.title}</h3><p>{purpose.text}</p></div>
                <div className="purpose-arrows"><button onClick={() => setActiveApproach((index + 4) % 5)} aria-label="Previous purpose" data-testid={`purpose-mobile-previous-${index + 1}`}><ArrowUpRight size={20} /></button><button onClick={() => setActiveApproach((index + 1) % 5)} aria-label="Next purpose" data-testid={`purpose-mobile-next-${index + 1}`}><ArrowUpRight size={20} /></button></div>
              </div>
            </div>
          </div>
        </div>)}</div>
        <div key={activeApproach} className={`purpose-feature purpose-feature--desktop purpose-feature--tone-${purposeTones[activeApproach % 4]}`} style={{ backgroundImage: `linear-gradient(90deg, rgba(8,8,8,.82), rgba(8,8,8,.08)), url(${img(approach[activeApproach].image)})` }} data-testid="active-purpose-panel">
          <div><span>{approach[activeApproach].number} / 05</span><h3>{approach[activeApproach].title}</h3><p>{approach[activeApproach].text}</p></div>
          <div className="purpose-arrows"><button onClick={() => setActiveApproach((activeApproach + 4) % 5)} data-testid="purpose-previous-button"><ArrowUpRight size={20} /></button><button onClick={() => setActiveApproach((activeApproach + 1) % 5)} data-testid="purpose-next-button"><ArrowUpRight size={20} /></button></div>
        </div>
      </div>
    </section>
    <ProjectsSlideshow />
    <section className="contact-section" id="contact" data-testid="contact-section">
      <div className="contact-orbit" aria-hidden="true"><span>LET'S BUILD<br />SOMETHING<br /><em>TOGETHER</em></span></div>
      <Reveal className="contact-copy"><span className="section-index">04 — START A PROJECT</span><h2>One Dream.<br /><em>One studio.</em></h2><ContactTrigger className="contact-cta-btn" testId="contact-section-cta">START A PROJECT</ContactTrigger></Reveal>
      <Clientele />
    </section>
  </main>;
}

function ProjectsSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => setActive((index) => (index + 1) % projects.length), 5000);
    return () => clearInterval(id);
  }, [paused]);
  const project = projects[active];
  const showNext = () => setActive((index) => (index + 1) % projects.length);
  const showPrev = () => setActive((index) => (index + projects.length - 1) % projects.length);
  const onTouchStart = (event) => { touchStartX.current = event.touches[0].clientX; };
  const onTouchEnd = (event) => {
    if (touchStartX.current == null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) showNext(); else showPrev();
  };
  return <section className="work-slideshow" id="work" data-testid="work-slideshow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <Reveal className="work-slideshow__head">
      <span className="section-index">03 — PROJECT CATALOGUE</span>
      <h2>Selected work,<br /><em>frame by frame.</em></h2>
      <Link to="/projects" className="work-slideshow__all" data-testid="work-slideshow-all">ALL PROJECTS <ArrowUpRight size={15} /></Link>
    </Reveal>
    <div className="work-slideshow__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} data-testid="work-slideshow-stage">
      <Link to={`/projects/${project.slug}`} key={project.slug} className="work-slideshow__frame" data-testid="work-slideshow-frame">
        <img src={img(project.image, 1600)} alt={project.title} />
        <span className="work-slideshow__meta">{project.category} · {project.location}</span>
      </Link>
      <div className="work-slideshow__bar">
        <div className="work-slideshow__info" key={project.slug}>
          <span className="work-slideshow__count">{String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span>
          <h3>{project.title}</h3>
          <span className="work-slideshow__segment">{project.segment}</span>
        </div>
        <div className="work-slideshow__arrows">
          <button type="button" onClick={showPrev} aria-label="Previous project" data-testid="work-slideshow-prev"><ChevronLeft size={20} /></button>
          <button type="button" onClick={showNext} aria-label="Next project" data-testid="work-slideshow-next"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="work-slideshow__dots">{projects.map((item, index) => <button type="button" key={item.slug} className={index === active ? "is-active" : ""} onClick={() => setActive(index)} aria-label={`Show ${item.title}`} data-testid={`work-slideshow-dot-${index + 1}`} />)}</div>
    </div>
  </section>;
}

function BdsmMark() {
  const tiles = ["tl","d","tr","tl","d","tr","tl","d","tr","tl","d","tr","tl","d","tr","tl","d","tr","tl","d","tr","tl","d","tr"];
  return <div className="zm-mark" aria-hidden="true">{tiles.map((t, i) => <span key={i} className={`zm-tile zm-tile--${t}`} />)}</div>;
}

function ScrollUpButton() {
  return <button className="footer-top" onClick={() => smoothScrollTo(0)} aria-label="Scroll to top" data-testid="footer-scroll-top"><span className="footer-top__label">To the Top</span><ArrowUp size={15.75} /></button>;
}

function NetworkExperience() {
  const { setOpen } = useContact();
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(() => segments.map(() => false));
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);
  const panelRefs = useRef([]);
  const copyRefs = useRef([]);
  const total = segments.length;

  useEffect(() => {
    // One geometric pass per scroll frame — cannot miss fast smooth-scroll glides:
    // rail follows the panel nearest the viewport centre, and each panel's copy reveals
    // the moment the copy block itself enters the viewport band (works in both scroll directions)
    let ticking = false;
    const run = () => {
      ticking = false;
      const vh = window.innerHeight;
      const mid = vh / 2;
      let best = 0;
      let bestDist = Infinity;
      panelRefs.current.forEach((node, i) => {
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= vh) return;
        const dist = Math.abs(rect.top + rect.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setActive(best);
      setRevealed((prev) => {
        let changed = false;
        const next = prev.map((was, i) => {
          const node = copyRefs.current[i];
          if (!node) return was;
          const rect = node.getBoundingClientRect();
          const now = rect.top < vh * 0.92 && rect.bottom > vh * 0.02;
          if (now !== was) changed = true;
          return now;
        });
        return changed ? next : prev;
      });
    };
    // rAF-throttle: multiple scroll events can fire within one frame during a
    // Lenis glide — run the geometric pass at most once per frame (mobile jank fix)
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(run);
    };
    run();
    const settle = window.setTimeout(run, 900); // re-check once images/layout settle (catches copy already in view on load)
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const insideTop = rect.top <= 0;
      const insideBottom = rect.bottom >= window.innerHeight;
      setVisible(insideTop && insideBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Register panels as snap points for the smooth scroller (replaces CSS scroll-snap)
  useEffect(() => {
    const { snap } = initSmoothScroll();
    const nodes = panelRefs.current.filter(Boolean);
    if (!snap || nodes.length === 0) return undefined;
    snap.addElements(nodes, { align: ["start"] });
    return () => nodes.forEach((node) => { if (typeof snap.removeElement === "function") snap.removeElement(node); });
  }, []);

  const goTo = (index) => {
    const node = panelRefs.current[index];
    if (node) smoothScrollTo(node);
  };

  return <section id="network" ref={sectionRef} className={`network-experience ${visible ? "network-experience--in-view" : ""}`} data-testid="network-section">
    <aside className="network-rail" aria-label="Segment navigation">
      <ol className="network-rail__list" data-testid="network-rail-list">
        {segments.map((segment, index) => <li key={segment.slug} className={index === active ? "network-rail__item--active" : ""}>
          <button onClick={() => goTo(index)} data-testid={`network-rail-${index + 1}`}>
            <span className="network-rail__label">{index + 1} {segment.name.toUpperCase()}</span>
            {index === active && <ChevronLeft className="network-rail__caret" size={20} aria-hidden="true" />}
          </button>
        </li>)}
      </ol>
    </aside>
    <div className="network-panels">
      {segments.map((segment, index) => <article key={segment.slug} ref={(node) => (panelRefs.current[index] = node)} data-index={index} className={`network-panel network-panel--${segment.tone} ${index === active ? "network-panel--active" : ""} ${revealed[index] ? "network-panel--revealed" : ""}`} data-testid={`network-panel-${index + 1}`}>
        <div className="network-panel__meta"><span>0{index + 1} / {String(total).padStart(2, "0")}</span><span>{segment.parent.toUpperCase()} · {segment.kicker.toUpperCase()}</span></div>
        <div className="network-panel__stage">
          <span className="network-panel__mascot-wrap"><img src={img(segment.hero)} alt={`${segment.name} sample`} className="network-panel__mascot" /></span>
        </div>
        <div className="network-panel__copy" ref={(node) => (copyRefs.current[index] = node)} data-copy-index={index}>
          <div className="network-panel__brand"><span className="np-brand-parent">{segment.parent}</span><span className="np-brand-name">{segment.name}</span></div>
          <h3>{segment.tagline}</h3>
          <p>{segment.body}</p>
          <ul className="network-panel__tags">{segment.services.map((service, tagIndex) => <li key={service} style={{ "--i": tagIndex }}>{service}</li>)}</ul>
          <div className="network-panel__actions">
            <Link to={segment.link || `/businesses/${segment.slug}`} className="np-btn np-btn--ghost" data-testid={`network-panel-${index + 1}-explore`}>EXPLORE <ArrowUpRight size={16} /></Link>
            <button type="button" onClick={() => setOpen(true)} className="np-btn np-btn--solid" data-testid={`network-panel-${index + 1}-contact`}>GET IN TOUCH <ArrowUpRight size={16} /></button>
          </div>
        </div>
      </article>)}
    </div>
  </section>;
}

function ExperienceSpotlight() {
  const { setOpen } = useContact();
  const copyRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const node = copyRef.current;
    if (!node) return undefined;
    // Reveal when the COPY block itself is meaningfully in view — replays in both
    // scroll directions (section-level isIntersecting fired at 1px, so scrolling up
    // the animation ran and finished before the copy ever reached the viewport).
    const observer = new IntersectionObserver(([entry]) => setRevealed(entry.intersectionRatio >= 0.25), { threshold: [0, 0.25] });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <section className={`experience-spotlight ${revealed ? "experience-spotlight--revealed" : ""}`} data-testid="experience-spotlight">
    <div className="experience-spotlight__header">
      <span className="section-index" data-testid="experience-spotlight-label">LIVE WITH OUR WORK</span>
      <p data-testid="experience-spotlight-status">A stayable home by BDSM · BDS Marvel</p>
    </div>
    <div className="experience-spotlight__layout">
      <div className="experience-spotlight__visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,8,8,.08), rgba(8,8,8,.68)), url(${img(livingStudio.hero)})` }} data-testid="experience-spotlight-image">
        <span data-testid="experience-spotlight-location">{livingStudio.kicker}</span>
        <strong data-testid="experience-spotlight-image-title">STAY INSIDE<br />THE MATERIAL.</strong>
      </div>
      <div className="experience-spotlight__copy" ref={copyRef}>
        <span className="experience-spotlight__badge" data-testid="experience-spotlight-badge">STAY OVER</span>
        <h2 data-testid="experience-spotlight-title">Air BnB<br /><em>Living Studio.</em></h2>
        <h3 data-testid="experience-spotlight-tagline">{livingStudio.tagline}</h3>
        <p data-testid="experience-spotlight-description">{livingStudio.body}</p>
        <ul data-testid="experience-spotlight-details">{livingStudio.details.map((detail, index) => <li key={detail} style={{ "--i": index }}>{detail}</li>)}</ul>
        <div className="experience-spotlight__actions">
          <Link to="/experience" className="np-btn np-btn--solid" data-testid="experience-spotlight-explore">EXPLORE THE STAY <ArrowUpRight size={16} /></Link>
          <Link to="/stays" className="np-btn np-btn--ghost" data-testid="experience-spotlight-request">REQUEST A NIGHT <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </div>
  </section>;
}

function Clientele() {
  const rows = [clients.slice(0, 12), clients.slice(12)];
  const tile = (client, testId) => <div className="client-logo" role="img" aria-label={`${client.name} logo`} key={client.name} data-testid={testId}>
    {client.logo ? <img src={client.logo} alt={client.name} loading="lazy" /> : <span className="client-logo__word">{client.name}</span>}
  </div>;
  return <section className="clients-section" id="clients" data-testid="clients-section">
    <Reveal className="clients-title">
      <div><span className="section-index" data-testid="clientele-label">Clientele</span><h2 data-testid="clientele-title">Trusted by leaders in hospitality, infrastructure, education and public institutions.</h2></div>
    </Reveal>
    <div className="client-marquee" data-testid="client-logo-marquee">
      {rows.map((row, rowIndex) => <div className={`client-logo-row client-logo-row--${rowIndex + 1}`} key={rowIndex} data-testid={`client-logo-row-${rowIndex + 1}`}>
        <div className="client-logo-track">
          <div className="client-logo-set">{row.map((client, index) => tile(client, `client-logo-${rowIndex * 12 + index + 1}`))}</div>
          <div className="client-logo-set" aria-hidden="true">{row.map((client, index) => tile(client, `client-logo-duplicate-${rowIndex * 12 + index + 1}`))}</div>
        </div>
      </div>)}
    </div>
  </section>;
}

function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const jump = (id) => {
    if (id === "top") {
      if (location.pathname === "/") smoothScrollTo(0);
      else navigate("/");
      return;
    }
    if (location.pathname === "/") {
      smoothScrollTo(document.getElementById(id));
      window.setTimeout(() => highlightSection(id), 650);
    } else {
      navigate(`/#${id}`);
    }
  };
  return <footer className="site-footer" data-testid="site-footer">
    <div className="site-footer__top">
      <div className="site-footer__brand"><span className="zm-name">BDSM<sup>®</sup></span></div>
      <BdsmMark />
    </div>
    <div className="site-footer__middle">
      <nav className="site-footer__nav" aria-label="Footer navigation">
        <button onClick={() => jump("top")} data-testid="footer-link-home">home</button>
        <button onClick={() => { navigate("/about"); }} data-testid="footer-link-about">about</button>
        <button onClick={() => jump("network")} data-testid="footer-link-agencies">what we do</button>
        <button onClick={() => { navigate("/projects"); }} data-testid="footer-link-projects">projects</button>
        <button onClick={() => { navigate("/catalogue"); }} data-testid="footer-link-catalogue">catalogue</button>
        <button onClick={() => { navigate("/experience"); }} data-testid="footer-link-bnb">air bnb</button>
        <button onClick={() => { navigate("/contact"); }} data-testid="footer-link-contact">contact</button>
      </nav>
      <div className="site-footer__socials">
        <a href="https://www.instagram.com/bdsm.co" target="_blank" rel="noreferrer" aria-label="Instagram" data-testid="footer-instagram-link"><Instagram size={17} /></a>
        <a href="https://www.linkedin.com/company/bdsm" target="_blank" rel="noreferrer" aria-label="LinkedIn" data-testid="footer-linkedin-link"><Linkedin size={17} /></a>
      </div>
    </div>
    <div className="site-footer__bottom"><span data-testid="footer-copyright">© BDSM · BDS Marvel {new Date().getFullYear()}</span><ScrollUpButton /></div>
  </footer>;
}

function PageShell({ children }) {
  const location = useLocation();
  useEffect(() => { initSmoothScroll(); }, []);
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const settle = () => {
        const target = document.getElementById(id);
        if (target) {
          smoothScrollTo(target);
          window.setTimeout(() => highlightSection(id), 650);
        }
      };
      window.requestAnimationFrame(() => window.setTimeout(settle, 40));
      return;
    }
    smoothScrollTo(0, { immediate: true });
    startSmoothScroll();
  }, [location.pathname, location.hash]);
  return <div className="route-shell" key={location.pathname}><Header />{children}<Footer /><ContactModal /></div>;
}

const ContactCtx = createContext({ open: false, setOpen: () => {} });
function ContactProvider({ children }) {
  const [open, setOpen] = useState(false);
  return <ContactCtx.Provider value={{ open, setOpen }}>{children}</ContactCtx.Provider>;
}
function useContact() { return useContext(ContactCtx); }

function ContactModal() {
  const { open, setOpen } = useContact();
  const [form, setForm] = useState({ name: "", email: "", company: "", segment: "", budget: "", message: "" });
  const [status, setStatus] = useState({ state: "idle", error: "" });
  const firstFieldRef = useRef(null);
  const scrollResumeRef = useRef(null);

  useEffect(() => {
    window.clearTimeout(scrollResumeRef.current);
    if (open) {
      setStatus({ state: "idle", error: "" });
      window.setTimeout(() => firstFieldRef.current?.focus(), 80);
      document.body.style.overflow = "hidden";
      stopSmoothScroll();
      return () => { document.body.style.overflow = ""; };
    }
    document.body.style.overflow = "";
    scrollResumeRef.current = window.setTimeout(() => startSmoothScroll(), 60);
    return () => window.clearTimeout(scrollResumeRef.current);
  }, [open]);
  useEffect(() => { const onKey = (event) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [setOpen]);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", error: "" });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/inquiries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), company: form.company.trim() || null, agency: form.segment || null, budget: form.budget || null, message: form.message.trim() }) });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.detail?.[0]?.msg || "Please double-check your details and try again.");
      }
      setStatus({ state: "sent", error: "" });
      setForm({ name: "", email: "", company: "", segment: "", budget: "", message: "" });
    } catch (error) {
      setStatus({ state: "error", error: error.message || "Something went wrong. Please try again." });
    }
  };

  if (!open) return null;
  return <div className="contact-modal" role="dialog" aria-modal="true" aria-label="Start a project" data-testid="contact-modal">
    <button className="contact-modal__scrim" onClick={() => setOpen(false)} aria-label="Close" data-testid="contact-modal-scrim" />
    <div className="contact-modal__panel">
      <button className="contact-modal__close" onClick={() => setOpen(false)} aria-label="Close" data-testid="contact-modal-close"><X size={22} /></button>
      <div className="contact-modal__intro">
        <span className="section-index">START A PROJECT</span>
        <h2>Let's build<br /><em>something together.</em></h2>
        <p>Tell us about your project — stone, flooring, construction or interiors. One team handles all of it, and we reply within one working day.</p>
        <div className="contact-modal__meta"><span>info.bdsmarvel@gmail.com</span><span>Mumbai · Kishangarh · Gurugram</span></div>
      </div>
      {status.state === "sent" ? <div className="contact-modal__success" data-testid="contact-modal-success"><Check size={40} /><h3>Thanks — we've got it.</h3><p>The team will be in touch shortly. In the meantime, feel free to explore the projects and catalogue.</p><button onClick={() => setOpen(false)} data-testid="contact-modal-done">CLOSE</button></div> : <form className="contact-modal__form" onSubmit={submit} data-testid="contact-modal-form" noValidate>
        <label className="cm-field"><span>Your name</span><input ref={firstFieldRef} required value={form.name} onChange={update("name")} placeholder="Riya Kapoor" data-testid="contact-name-input" /></label>
        <label className="cm-field"><span>Work email</span><input required type="email" value={form.email} onChange={update("email")} placeholder="you@brand.com" data-testid="contact-email-input" /></label>
        <label className="cm-field"><span>Company / Studio</span><input value={form.company} onChange={update("company")} placeholder="BDSM" data-testid="contact-company-input" /></label>
        <label className="cm-field"><span>What does your project need?</span><select value={form.segment} onChange={update("segment")} data-testid="contact-agency-select"><option value="">Not sure yet</option>{segments.map((segment) => <option key={segment.slug} value={segment.name}>{segment.name}</option>)}</select></label>
        <label className="cm-field cm-field--full"><span>Rough budget</span><select value={form.budget} onChange={update("budget")} data-testid="contact-budget-select"><option value="">Prefer not to say</option><option value="under-25L">Under ₹25L</option><option value="25L-1Cr">₹25L – ₹1Cr</option><option value="1-5Cr">₹1Cr – ₹5Cr</option><option value="5Cr-plus">₹5Cr +</option></select></label>
        <label className="cm-field cm-field--full"><span>Tell us about the project</span><textarea required rows={4} value={form.message} onChange={update("message")} placeholder="Site, brief, materials in mind — anything helps." data-testid="contact-message-input" /></label>
        {status.state === "error" && <div className="cm-error" data-testid="contact-modal-error">{status.error}</div>}
        <button type="submit" className="cm-submit" disabled={status.state === "sending"} data-testid="contact-modal-submit">{status.state === "sending" ? <><Loader2 size={16} className="cm-spin" /> Sending…</> : <>SEND INQUIRY <ArrowUpRight size={16} /></>}</button>
      </form>}
    </div>
  </div>;
}

function ContactTrigger({ className = "", children = "START A PROJECT", testId = "open-contact-modal" }) {
  const { setOpen } = useContact();
  return <button type="button" className={className} onClick={() => setOpen(true)} data-testid={testId}>{children} <ArrowUpRight size={16} /></button>;
}

function SegmentPage() {
  const { slug } = useParams();
  const segment = segments.find((item) => item.slug === slug) || segments[0];
  const related = projects.filter((item) => item.segment === segment.name);
  usePageMeta(...(SEGMENT_SEO[segment.slug] || SEGMENT_SEO["marble-and-stone"]));
  return <main className={`detail-page detail-page--${segment.tone}`} data-testid="agency-detail-page">
    <section className="detail-hero" style={{ backgroundImage: `linear-gradient(160deg, rgba(10,8,6,.78), rgba(10,8,6,.42)), url(${img(segment.hero)})` }}>
      <div className="detail-kicker"><span>{segment.parent.toUpperCase()} · {String(segments.indexOf(segment) + 1).padStart(2, "0")} / {String(segments.length).padStart(2, "0")}</span><Link to="/" data-testid="agency-detail-back-link">BACK TO NETWORK</Link></div>
      <div className="detail-hero-grid">
        <div>
          <p className="eyebrow">{segment.parent.toUpperCase()}</p>
          <h1>{segment.name}<span className="hero-dot">.</span></h1>
          <p className="detail-lede">{segment.body}</p>
          <div className="detail-services">{segment.services.map((service) => <span key={service}>{service}</span>)}</div>
        </div>
      </div>
    </section>
    <section className="detail-content">
      <div className="detail-intro"><span className="section-index">01 — POINT OF VIEW</span><h2>{segment.tagline}</h2></div>
      <div className="detail-columns">
        <div><span className="section-index">CAPABILITIES</span><ul className="service-list">{segment.services.map((service, index) => <li key={service}><span>0{index + 1}</span>{service}<ArrowUpRight size={15} /></li>)}</ul></div>
        <div><span className="section-index">THE TEAM</span><ul className="team-list">{segment.team.map((person) => <li key={person}>{person}</li>)}</ul></div>
      </div>
    </section>
    <section className="detail-work">
      <div className="detail-intro"><span className="section-index">02 — SELECTED PROJECTS</span><h2>Work in the<br /><em>material.</em></h2></div>
      <div className="mini-work-grid">{(related.length ? related : projects.slice(0, 2)).map((work) => <Link to={`/projects/${work.slug}`} className="mini-work" key={work.title} data-testid={`agency-work-${work.slug}`}><img src={img(work.image, 1200)} alt="" /><div><span>{work.category} · {work.year}</span><h3>{work.title}</h3><ArrowUpRight size={18} /></div></Link>)}</div>
    </section>
    <section className="detail-cta"><span className="section-index">READY WHEN YOU ARE</span><h2>Let's build<br /><em>something together.</em></h2><ContactTrigger className="contact-cta-btn" testId="agency-detail-contact-link">START A PROJECT</ContactTrigger></section>
  </main>;
}

function ProjectPage() {
  const { slug } = useParams();
  const project = projects.find((item) => item.slug === slug) || projects[0];
  const segment = segments.find((item) => item.name === project.segment);
  const nextProject = projects[(projects.indexOf(project) + 1) % projects.length];
  usePageMeta(`${project.title} | BDSM · BDS Marvel Projects`, `${project.title} — a ${project.category.toLowerCase()} project in ${project.location}, designed and delivered in-house by BDSM · BDS Marvel.`);
  return <main className={`case-study-page case-study-page--${segment?.tone || "sand"}`} data-testid="case-study-page">
    <section className="case-study-hero"><div className="detail-kicker"><span>{project.segment.toUpperCase()} · {project.year}</span><Link to="/projects" data-testid="case-study-back-link">BACK TO PROJECTS</Link></div><div className="case-study-hero-copy"><span className="section-index">{project.category.toUpperCase()} · {project.location}</span><h1>{project.title}<span className="hero-dot">.</span></h1><p>{project.description}</p></div><div className="case-study-hero-image"><img src={img(project.image)} alt="" data-testid="case-study-hero-image" /></div></section>
    <section className="case-study-overview"><div className="case-study-overview-label"><span className="section-index">01 — THE BRIEF</span><Link to={`/businesses/${segment?.slug || "marble-and-stone"}`} data-testid="case-study-agency-link">VIEW {project.segment.toUpperCase()} <ArrowUpRight size={15} /></Link></div><div className="case-study-story"><div><span className="story-label">THE CHALLENGE</span><h2>{project.challenge}</h2></div><div><span className="story-label">THE APPROACH</span><p>{project.approach}</p></div></div></section>
    <section className="case-study-gallery"><div className="case-study-gallery-heading"><span className="section-index">02 — IN PLACE</span><h2>Detail in<br /><em>the material.</em></h2></div><div className="case-study-images">{project.gallery.map((image, index) => <figure className={`case-study-image case-study-image--${index + 1}`} key={image}><img src={img(image, 1200)} alt={`${project.title} view ${index + 1}`} data-testid={`case-study-gallery-image-${index + 1}`} /><figcaption>0{index + 1} / {project.category.toUpperCase()}</figcaption></figure>)}</div></section>
    <section className="case-study-results"><div><span className="section-index">03 — OUTCOMES</span><h2>Proof in<br /><em>the numbers.</em></h2></div><div className="result-grid">{project.outcomes.map(([value, label]) => <div className="result-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>
    <section className="case-study-credits"><div><span className="section-index">04 — CREDITS</span><h2>Built by<br /><em>one team.</em></h2></div><div className="credits-list">{project.credits.map((credit, index) => <div key={credit}><span>0{index + 1}</span><p>{credit}</p></div>)}</div></section>
    <section className="case-study-next"><span className="section-index">UP NEXT</span><Link to={`/projects/${nextProject.slug}`} data-testid="next-case-study-link"><span>{nextProject.segment} · {nextProject.category}</span><h2>{nextProject.title}<ArrowUpRight size={27} /></h2></Link></section>
  </main>;
}

function ProjectsArchive() {
  usePageMeta("Projects | BDSM · BDS Marvel", "Residential, hospitality, commercial and civic projects in stone, flooring, construction and interiors — delivered across India by one in-house team.");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All work");
  const filterOptions = ["All work", ...segments.map((s) => s.name)];
  const filtered = useMemo(() => projects.filter((item) => (filter === "All work" || item.segment === filter) && `${item.title} ${item.category} ${item.segment} ${item.location}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <main className="work-page" data-testid="work-archive-page">
    <section className="work-hero"><div className="detail-kicker"><span>BDSM · PROJECTS {new Date().getFullYear()}</span><Link to="/" data-testid="work-back-home-link">BACK HOME</Link></div><p className="eyebrow">THE WORK</p><h1>Projects across<br /><em>materials & scale.</em></h1><p className="work-hero-copy">Selected work by BDSM · BDS Marvel — residential, hospitality, commercial and civic projects in stone, flooring, construction and interiors, all delivered by one in-house team.</p></section>
    <section className="work-library">
      <div className="work-controls">
        <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" aria-label="Search projects" data-testid="work-search-input" /></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by business" data-testid="work-agency-filter">{filterOptions.map((option) => <option key={option}>{option}</option>)}</select>
        <span className="work-count" data-testid="work-result-count">{filtered.length.toString().padStart(2, "0")} PROJECTS</span>
      </div>
      <div className="work-grid">{filtered.map((work, index) => <Link to={`/projects/${work.slug}`} className="work-card" key={work.title} data-testid={`work-card-${index + 1}`}><div className="work-image-wrap"><img src={img(work.image, 1200)} alt="" /><span>{work.year}</span></div><div className="work-card-copy"><div><span>{work.segment} · {work.category} · {work.location}</span><h2>{work.title}</h2><p>{work.description}</p></div><ArrowUpRight size={21} /></div></Link>)}{filtered.length === 0 && <div className="empty-work" data-testid="work-empty-state">No projects match. Try a different search.</div>}</div>
    </section>
  </main>;
}

function CataloguePage() {
  usePageMeta("Material Catalogue | BDSM · BDS Marvel", "Browse marble, granite, kota, travertine, SPC and oak flooring, veneers and finishes — sampled and supplied by BDSM · BDS Marvel.");
  const [material, setMaterial] = useState("All");
  const [product, setProduct] = useState("All");
  const [application, setApplication] = useState("All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => catalogueItems.filter((item) => (material === "All" || item.material === material) && (product === "All" || item.product === product) && (application === "All" || item.application === application) && `${item.name} ${item.material} ${item.product} ${item.application} ${item.origin}`.toLowerCase().includes(query.toLowerCase())), [material, product, application, query]);
  return <main className="catalogue-page" data-testid="catalogue-page">
    <section className="catalogue-hero">
      <div className="detail-kicker"><span>BDSM · CATALOGUE</span><Link to="/" data-testid="catalogue-back-link">BACK HOME</Link></div>
      <p className="eyebrow">MATERIAL · PRODUCT · APPLICATION</p>
      <h1>Browse the<br /><em>material library.</em></h1>
      <p className="catalogue-hero__copy">Filter across every material we source and every product we make — slabs, facades, fountains, furniture, flooring and decorative pieces. Sample requests go straight to the workshop.</p>
    </section>
    <section className="catalogue-controls">
      <div className="catalogue-filter">
        <span className="filter-label">Material</span>
        <div className="filter-pills">{materialsFilter.map((option) => <button key={option} className={`filter-pill ${material === option ? "filter-pill--active" : ""}`} onClick={() => setMaterial(option)} data-testid={`catalogue-material-${option.toLowerCase()}`}>{option}</button>)}</div>
      </div>
      <div className="catalogue-filter">
        <span className="filter-label">Product</span>
        <div className="filter-pills">{productsFilter.map((option) => <button key={option} className={`filter-pill ${product === option ? "filter-pill--active" : ""}`} onClick={() => setProduct(option)} data-testid={`catalogue-product-${option.toLowerCase()}`}>{option}</button>)}</div>
      </div>
      <div className="catalogue-filter">
        <span className="filter-label">Application</span>
        <div className="filter-pills">{applicationsFilter.map((option) => <button key={option} className={`filter-pill ${application === option ? "filter-pill--active" : ""}`} onClick={() => setApplication(option)} data-testid={`catalogue-application-${option.toLowerCase()}`}>{option}</button>)}</div>
      </div>
      <div className="catalogue-searchbox">
        <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the library" aria-label="Search catalogue" data-testid="catalogue-search-input" /></label>
        <span className="work-count" data-testid="catalogue-result-count">{filtered.length.toString().padStart(2, "0")} ITEMS</span>
      </div>
    </section>
    <section className="catalogue-grid" data-testid="catalogue-grid">
      {filtered.map((item, index) => <article className="catalogue-card" key={item.slug} data-testid={`catalogue-card-${index + 1}`}>
        <div className="catalogue-card__image"><img src={img(item.image, 900)} alt={item.name} /></div>
        <div className="catalogue-card__body">
          <div className="catalogue-card__meta"><span>{item.material}</span><span>{item.application}</span></div>
          <h3>{item.name}</h3>
          <p>{item.origin}</p>
          <ContactTrigger className="contact-cta-btn" testId={`catalogue-request-${index + 1}`}>REQUEST SAMPLE</ContactTrigger>
        </div>
      </article>)}
      {filtered.length === 0 && <div className="empty-work">No items match those filters — try loosening one.</div>}
    </section>
  </main>;
}

function ExperiencePage() {
  usePageMeta("The BDSM Living Studio | Design Stay", "Stay inside a working BDSM · BDS Marvel home — three suites built with our own stone, floors, finishes and furniture.");
  return <main className="experience-page" data-testid="experience-page">
    <section className="experience-hero" style={{ backgroundImage: `linear-gradient(160deg, rgba(10,8,6,.55), rgba(10,8,6,.32)), url(${img("photo-1600585154340-be6161a56a0c")})` }}>
      <div className="detail-kicker"><span>BDSM · LIVING STUDIO</span><Link to="/" data-testid="experience-back-link">BACK HOME</Link></div>
      <div className="experience-hero__copy"><p className="eyebrow">BnB · LIVING STUDIO</p><h1>Don't just see<br /><em>the material — stay in it.</em></h1><p>The BDSM Living Studio is a small guesthouse built entirely with our own materials and finishes. Book a night, explore the surfaces, and specify your project from inside a working reference.</p><Link to="/stays" className="np-btn np-btn--paper" data-testid="experience-book-cta">REQUEST A NIGHT <ArrowUpRight size={16} /></Link></div>
    </section>
    <section className="experience-tiers" data-testid="experience-tiers">
      <div className="experience-tiers__heading"><span className="section-index">THREE WAYS TO STAY</span><h2>Three BnBs,<br /><em>three kinds of night.</em></h2><p>From the flagship Living Studio — where you experience our work first-hand — to an easy city loft and an honest courtyard room by the workshop.</p></div>
      <div className="experience-tiers__grid">
        {stayTiers.map((tier) => {
          const first = stays.find((stay) => stay.tier === tier.name);
          return <Link to={`/stays/${tier.slug}`} className="stay-tier-card" key={tier.slug} data-testid={`experience-tier-${tier.slug}`}>
            <div className="stay-tier-card__media"><img src={img(first.hero, 900)} alt={`${tier.name} stays`} loading="lazy" /></div>
            <div className="stay-tier-card__body">
              <h3>{tier.headline}</h3>
              <p>{tier.copy}</p>
              <span className="stay-tier-card__meta">{stays.filter((stay) => stay.tier === tier.name).length} stays · from {stays.filter((stay) => stay.tier === tier.name).map((stay) => stay.price).sort()[0]}/night</span>
              <span className="stay-tier-card__cta">EXPLORE &amp; BOOK <ArrowUpRight size={15} /></span>
            </div>
          </Link>;
        })}
      </div>
    </section>
    <section className="experience-gallery">
      <div className="experience-gallery__heading"><span className="section-index">02 — INSIDE</span><h2>Every surface,<br /><em>made by us.</em></h2></div>
      <div className="experience-gallery__grid">
        {["photo-1600585154340-be6161a56a0c", "photo-1600566753190-17f0baa2a6c3", "photo-1618221195710-dd6b41faaea6", "photo-1600607687939-ce8a6c25118c", "photo-1616486338812-3dadae4b4ace", "photo-1580587771525-78b9dba3b914"].map((imageId, index) => <figure className={`experience-gallery__tile experience-gallery__tile--${index + 1}`} key={imageId}><img src={img(imageId, 1200)} alt="" data-testid={`experience-image-${index + 1}`} /></figure>)}
      </div>
    </section>
    <section className="experience-cta">
      <div><span className="section-index">READY WHEN YOU ARE</span><h2>Book a night at<br /><em>the Living Studio.</em></h2><p>Availability is limited — we host a handful of stays each month between site visits.</p></div>
      <Link to="/stays" className="np-btn np-btn--solid experience-cta__btn" data-testid="experience-book-second">REQUEST A NIGHT <ArrowUpRight size={16} /></Link>
    </section>
  </main>;
}

function BookingModal({ stay, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", checkIn: "", checkOut: "", guests: "2", message: "" });
  const [status, setStatus] = useState({ state: "idle", error: "" });
  const [booked, setBooked] = useState([]);
  const [pending, setPending] = useState([]);
  const firstFieldRef = useRef(null);
  const scrollResumeRef = useRef(null);
  const open = Boolean(stay);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    window.clearTimeout(scrollResumeRef.current);
    if (open) {
      setStatus({ state: "idle", error: "" });
      setForm({ name: "", email: "", checkIn: "", checkOut: "", guests: "2", message: "" });
      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/stays/availability?stay=${encodeURIComponent(stay.name)}`)
        .then((res) => (res.ok ? res.json() : { booked: [], requested: [] }))
        .then((data) => { setBooked(data.booked || []); setPending(data.requested || []); })
        .catch(() => { setBooked([]); setPending([]); });
      window.setTimeout(() => firstFieldRef.current?.focus(), 80);
      document.body.style.overflow = "hidden";
      stopSmoothScroll();
      return () => { document.body.style.overflow = ""; };
    }
    document.body.style.overflow = "";
    scrollResumeRef.current = window.setTimeout(() => startSmoothScroll(), 60);
    return () => window.clearTimeout(scrollResumeRef.current);
  }, [open]);
  useEffect(() => { const onKey = (event) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const overlapping = booked.find((range) => form.checkIn && form.checkOut && form.checkIn < range.check_out && form.checkOut > range.check_in);

  const submit = async (event) => {
    event.preventDefault();
    if (form.checkOut && form.checkIn && form.checkOut <= form.checkIn) {
      setStatus({ state: "error", error: "Check-out must be after check-in." });
      return;
    }
    if (overlapping) {
      setStatus({ state: "error", error: `Those nights are already booked (${overlapping.check_in} to ${overlapping.check_out}). Please pick different dates.` });
      return;
    }
    setStatus({ state: "sending", error: "" });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stay: stay.name, name: form.name.trim(), email: form.email.trim(), check_in: form.checkIn, check_out: form.checkOut, guests: Number(form.guests), message: form.message.trim() || null }) });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const message = typeof detail?.detail === "string" ? detail.detail : detail?.detail?.[0]?.msg;
        throw new Error(message || "Please double-check your details and try again.");
      }
      setStatus({ state: "sent", error: "" });
    } catch (error) {
      setStatus({ state: "error", error: error.message || "Something went wrong. Please try again." });
    }
  };

  if (!open) return null;
  return <div className="contact-modal" role="dialog" aria-modal="true" aria-label="Book a stay" data-testid="booking-modal">
    <button className="contact-modal__scrim" onClick={onClose} aria-label="Close" data-testid="booking-modal-scrim" />
    <div className="contact-modal__panel">
      <button className="contact-modal__close" onClick={onClose} aria-label="Close" data-testid="booking-modal-close"><X size={22} /></button>
      <div className="contact-modal__intro">
        <span className="section-index">BOOK A STAY</span>
        <h2>{stay.name}</h2>
        <p>{stay.location} · from {stay.price}/night · sleeps {stay.guests}. Send your dates — we confirm availability within one working day.</p>
        <div className="contact-modal__meta"><span>info.bdsmarvel@gmail.com</span><span>{stay.location}</span></div>
      </div>
      {status.state === "sent" ? <div className="contact-modal__success" data-testid="booking-modal-success"><Check size={40} /><h3>Request received.</h3><p>Thanks — we'll confirm availability for {stay.name} within one working day and hold your dates in the meantime.</p><button onClick={onClose} data-testid="booking-modal-done">CLOSE</button></div> : <form className="contact-modal__form" onSubmit={submit} data-testid="booking-modal-form" noValidate>
        <label className="cm-field"><span>Your name</span><input ref={firstFieldRef} required value={form.name} onChange={update("name")} placeholder="Riya Kapoor" data-testid="booking-name-input" /></label>
        <label className="cm-field"><span>Email</span><input required type="email" value={form.email} onChange={update("email")} placeholder="you@email.com" data-testid="booking-email-input" /></label>
        <label className="cm-field"><span>Check-in</span><input required type="date" min={today} value={form.checkIn} onChange={update("checkIn")} data-testid="booking-checkin-input" /></label>
        <label className="cm-field"><span>Check-out</span><input required type="date" min={form.checkIn || today} value={form.checkOut} onChange={update("checkOut")} data-testid="booking-checkout-input" /></label>
        {booked.length > 0 && <div className="cm-booked" data-testid="booking-booked-ranges"><span>Already booked:</span>{booked.map((range) => <em key={`${range.check_in}-${range.check_out}`}>{range.check_in} → {range.check_out}</em>)}</div>}
        {pending.length > 0 && <div className="cm-booked cm-booked--pending" data-testid="booking-pending-ranges"><span>Awaiting confirmation:</span>{pending.map((range) => <em key={`${range.check_in}-${range.check_out}`}>{range.check_in} → {range.check_out}</em>)}</div>}
        <label className="cm-field cm-field--full"><span>Guests</span><select value={form.guests} onChange={update("guests")} data-testid="booking-guests-select">{Array.from({ length: stay.guests }, (_, i) => i + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "guest" : "guests"}</option>)}</select></label>
        <label className="cm-field cm-field--full"><span>Anything we should know? (optional)</span><textarea rows={3} value={form.message} onChange={update("message")} placeholder="Arrival time, occasions, material walkthrough requests…" data-testid="booking-message-input" /></label>
        {status.state === "error" && <div className="cm-error" data-testid="booking-modal-error">{status.error}</div>}
        <button type="submit" className="cm-submit" disabled={status.state === "sending"} data-testid="booking-modal-submit">{status.state === "sending" ? <><Loader2 size={16} className="cm-spin" /> Sending…</> : <>REQUEST BOOKING <ArrowUpRight size={16} /></>}</button>
      </form>}
    </div>
  </div>;
}

function StayCard({ stay, index, onBook }) {
  return <article className={`stay-card ${index % 2 === 1 ? "stay-card--flip" : ""}`} data-testid={`stay-card-${stay.slug}`}>
    <div className="stay-card__media"><img src={img(stay.hero, 1200)} alt={stay.name} loading="lazy" /></div>
    <div className="stay-card__body">
      <span className="section-index">{String(index + 1).padStart(2, "0")}</span>
      <h2>{stay.name}</h2>
      <p className="stay-card__location">{stay.location} · {stay.bedrooms} {stay.bedrooms === 1 ? "bedroom" : "bedrooms"} · sleeps {stay.guests}</p>
      <p className="stay-card__description">{stay.description}</p>
      <ul className="stay-card__amenities">{stay.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}</ul>
      <div className="stay-card__footer">
        <span className="stay-card__price" data-testid={`stay-price-${stay.slug}`}>from <strong>{stay.price}</strong> / night</span>
        <button type="button" className="np-btn np-btn--solid" onClick={() => onBook(stay)} data-testid={`stay-book-${stay.slug}`}>BOOK THIS STAY <ArrowUpRight size={16} /></button>
      </div>
    </div>
  </article>;
}

function StaysPage() {
  usePageMeta("Stays & BnBs | BDSM · BDS Marvel", "Explore BDSM · BDS Marvel stays — premium, mid and budget-friendly BnBs across India. Book a night directly.");
  return <main className="stays-page" data-testid="stays-page">
    <section className="stays-hero">
      <div className="detail-kicker"><span>BDSM · STAYS</span><Link to="/experience" data-testid="stays-back-link">THE LIVING STUDIO</Link></div>
      <div className="stays-hero__copy"><p className="eyebrow">AIR BNB · THREE CATEGORIES</p><h1>Explore our BnBs.<br /><em>Book your night.</em></h1><p>Fifteen stays across three categories — premium homes where you experience our work first-hand, easy mid-range city apartments, and honest budget-friendly rooms. Pick a category, choose your dates, and we confirm within one working day.</p></div>
    </section>
    <section className="experience-tiers" data-testid="stays-tier-index">
      <div className="experience-tiers__grid">
        {stayTiers.map((tier) => {
          const tierStays = stays.filter((stay) => stay.tier === tier.name);
          const lowest = tierStays.map((stay) => stay.price).sort()[0];
          return <Link to={`/stays/${tier.slug}`} className="stay-tier-card" key={tier.slug} data-testid={`stays-tier-${tier.slug}`}>
            <div className="stay-tier-card__media"><img src={img(tierStays[0].hero, 900)} alt={`${tier.name} stays`} /></div>
            <div className="stay-tier-card__body">
              <h3>{tier.headline}</h3>
              <p>{tier.copy}</p>
              <span className="stay-tier-card__meta">{tierStays.length} stays · from {lowest}/night</span>
              <span className="stay-tier-card__cta">EXPLORE STAYS <ArrowUpRight size={15} /></span>
            </div>
          </Link>;
        })}
      </div>
    </section>
  </main>;
}

function StaysCategoryPage() {
  const { tier } = useParams();
  const meta = stayTiers.find((item) => item.slug === tier);
  const tierStays = stays.filter((stay) => tierSlugOf(stay.tier) === tier);
  const [booking, setBooking] = useState(null);
  usePageMeta(meta ? `${meta.name} Stays | BDSM · BDS Marvel` : "Stays | BDSM · BDS Marvel", meta ? `${meta.headline} ${meta.copy}` : "Explore BDSM · BDS Marvel stays.");
  if (!meta) return <Navigate to="/stays" replace />;
  return <main className="stays-page" data-testid="stays-category-page">
    <section className="stays-hero">
      <div className="detail-kicker"><span>BDSM · STAYS</span><Link to="/stays" data-testid="stays-category-back-link">ALL CATEGORIES</Link></div>
      <div className="stays-hero__copy"><p className="eyebrow">{tierStays.length} STAYS</p><h1>{meta.headline.replace(/\.$/, "")}<br /><em>Pick your stay.</em></h1><p>{meta.copy}</p></div>
    </section>
    <section className="stays-list" data-testid="stays-list">
      {tierStays.map((stay, index) => <StayCard key={stay.slug} stay={stay} index={index} onBook={setBooking} />)}
    </section>
    <BookingModal stay={booking} onClose={() => setBooking(null)} />
  </main>;
}

function ContactPage() {
  usePageMeta("Contact Us | BDSM · BDS Marvel", "Talk to BDSM · BDS Marvel about your project — studios in Mumbai, Kishangarh, Gurugram, Pune, New Delhi and Goa. We reply within one working day.");
  const { setOpen } = useContact();
  const cities = [
    { code: "MUM", brand: "BDSM", city: "Mumbai", address: "Sales & Design Studio · Kalina, Santacruz East, Mumbai, Maharashtra 400098" },
    { code: "KSN", brand: "DRAWSTONES", city: "Kishangarh", address: "Marble Workshop · RIICO Marble Zone, Kishangarh, Ajmer, Rajasthan 305801" },
    { code: "GGN", brand: "RENEST", city: "Gurugram", address: "Flooring Warehouse · Sector 49, Sohna Road, Gurugram, Haryana 122018" },
    { code: "PNE", brand: "FORMWORK", city: "Pune", address: "Construction Office · Baner-Pashan Link Road, Pune, Maharashtra 411045" },
    { code: "DEL", brand: "VIGNETTE", city: "New Delhi", address: "Interior Design Studio · Shahpur Jat, New Delhi 110049" },
    { code: "GOA", brand: "LIVING STUDIO", city: "Goa", address: "BDSM Living Studio · Assagao, Bardez, North Goa 403507" },
  ];
  const [active, setActive] = useState(0);
  const current = cities[active];
  return <main className="contact-page" data-testid="contact-page">
    <section className="contact-page__hero"><h1>Come see<br /><em>the material.</em></h1></section>
    <section className="contact-page__body">
      <div className="contact-cities" data-testid="contact-cities">
        {cities.map((city, index) => <button key={city.code} className={`contact-city ${index === active ? "contact-city--active" : ""}`} onClick={() => setActive(index)} data-testid={`contact-city-${city.code}`}>
          <span className="contact-city__code">{city.brand}</span>
          <ChevronRight size={18} />
        </button>)}
        <div className="contact-page__info">
          <a href="mailto:info.bdsmarvel@gmail.com" data-testid="press-email">info.bdsmarvel@gmail.com</a>
          <a href="mailto:info.bdsmarvel@gmail.com" data-testid="bd-email">info.bdsmarvel@gmail.com</a>
          <p>Phone : <a href="tel:+911140000000" data-testid="contact-phone">+91 11 4000 0000</a></p>
          <div className="contact-page__socials">
            <a href="https://www.instagram.com/bdsm.co" target="_blank" rel="noreferrer" aria-label="Instagram" data-testid="social-instagram"><Instagram size={18} /></a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" data-testid="social-facebook"><Facebook size={18} /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" data-testid="social-twitter"><Twitter size={18} /></a>
            <a href="https://www.linkedin.com/company/bdsm" target="_blank" rel="noreferrer" aria-label="LinkedIn" data-testid="social-linkedin"><Linkedin size={18} /></a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" data-testid="social-youtube"><Youtube size={18} /></a>
          </div>
        </div>
      </div>
      <div className="contact-detail">
        <p className="contact-detail__location" data-testid="active-city-name">{current.city}</p>
        <p className="contact-detail__address" data-testid="active-city-address">{current.address}</p>
        <button className="contact-detail__cta" onClick={() => setOpen(true)} data-testid="contact-get-in-touch">Get in Touch <ArrowUpRight size={16} /></button>
        <div className="contact-monument" aria-hidden="true">
          <svg viewBox="0 0 620 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <g fill="none" stroke="#2b2b2b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 300 L600 300" />
              <path d="M120 300 L120 200 Q120 170 160 170 L200 170 Q240 170 240 200 L240 300" />
              <path d="M170 300 L170 200 Q170 180 185 180 Q200 180 200 200 L200 300" />
              <path d="M120 220 L240 220" />
              <path d="M380 300 L380 200 Q380 170 420 170 L460 170 Q500 170 500 200 L500 300" />
              <path d="M430 300 L430 200 Q430 180 445 180 Q460 180 460 200 L460 300" />
              <path d="M380 220 L500 220" />
              <path d="M250 300 L250 130 L370 130 L370 300" />
              <path d="M260 300 L260 145 L360 145 L360 300" />
              <path d="M280 300 L280 165 Q280 150 300 150 Q320 150 320 165 L320 300" />
              <path d="M300 150 L300 300" />
              <path d="M250 200 L370 200" />
              <path d="M250 250 L370 250" />
              <path d="M170 170 L170 140 L210 140 L210 170" />
              <path d="M175 140 L175 115 L205 115 L205 140" />
              <path d="M190 115 L190 95" />
              <path d="M186 95 L194 95 L190 82 Z" />
              <path d="M430 170 L430 140 L470 140 L470 170" />
              <path d="M435 140 L435 115 L465 115 L465 140" />
              <path d="M450 115 L450 95" />
              <path d="M446 95 L454 95 L450 82 Z" />
              <path d="M305 130 L305 100 L315 100 L315 130" />
              <path d="M310 100 L310 80" />
              <path d="M306 80 L314 80 L310 65 Z" />
              <circle cx="310" cy="180" r="6" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  </main>;
}

function AboutPage() {
  usePageMeta("About Us | BDSM · BDS Marvel", "One design and build company for stone, flooring, construction and interiors — 20+ years, 200+ projects, studios across India.");
  const principles = [
    { number: "01", title: "Material comes first", text: "Before the drawing, we specify the stone or the surface. The rest of the project is designed around what the material actually wants to do." },
    { number: "02", title: "One accountable team", text: "Materials, flooring, construction and interiors all report into a single project lead. Fewer handovers, fewer things lost in translation." },
    { number: "03", title: "Detail is a discipline", text: "Every joint, threshold and reveal is drawn before it's built. Nothing is decided on site that could have been decided at the desk." },
    { number: "04", title: "Craft is not decorative", text: "Traditional cutting and finishing techniques are part of the engineering — not a nostalgia bolted on at the end." },
    { number: "05", title: "Experience over pitch", text: "Instead of a moodboard, we invite clients to stay in a space that uses our full palette. Specify from inside the reference." },
    { number: "06", title: "Long horizons", text: "We build for how a space looks in year ten, not the day it opens." },
  ];
  const timeline = [
    { year: "2003", event: "First quarry allocation in Kishangarh; workshop begins cutting and polishing." },
    { year: "2008", event: "Facade stone supply for the first hotel group project in Rajasthan." },
    { year: "2013", event: "Flooring line launched — contract SPC and hospitality-grade oak plank." },
    { year: "2017", event: "Construction team formed to close the loop from material to structure." },
    { year: "2020", event: "Interiors studio established for full design + execution." },
    { year: "2023", event: "BDSM · BDS Marvel brings stone, flooring, construction and interior decor under one roof — the Drawstones, Renest, Formwork and Vignette teams." },
    { year: "2024", event: "BDSM Living Studio opens in Goa as our public reference and stayable showroom." },
  ];
  const team = [
    { name: "Drawstones", role: "Materials & Sourcing", image: "photo-1618221195710-dd6b41faaea6" },
    { name: "Renest", role: "Specification & Distribution", image: "photo-1616486338812-3dadae4b4ace" },
    { name: "Formwork", role: "Structure & Site Management", image: "photo-1503387762-592deb58ef4e" },
    { name: "Vignette", role: "Design & Execution", image: "photo-1600585154340-be6161a56a0c" },
    { name: "Head of Craft", role: "Workshop & Fabrication", image: "photo-1600607687939-ce8a6c25118c" },
    { name: "Head of Living Studio", role: "B&B & Client Experience", image: "photo-1600566753190-17f0baa2a6c3" },
  ];
  return <main className="about-page" data-testid="about-page">
    <section className="about-hero">
      <div className="detail-kicker"><span>BDSM · ABOUT</span><Link to="/" data-testid="about-back-link">BACK HOME</Link></div>
      <p className="eyebrow">THE STUDIO</p>
      <h1>One team, from<br /><em>quarry to keys.</em></h1>
      <div className="about-hero__lede">
        <p><strong>BDSM · BDS Marvel</strong> is one design and build company. Marble and stone, flooring, turnkey construction and interior design — all handled in-house by our own teams: Drawstones for stone, Renest for flooring, Formwork for construction and Vignette for interiors. One contract, one accountable team, from facade to floor to furniture.</p>
        <p>We are not new — the names are. Our people have supplied stone, laid floors, raised structures and finished interiors for some of the country's most demanding hotel groups, developers, retailers and civic projects for over twenty years.</p>
      </div>
    </section>

    <section className="about-strip">
      <div className="about-strip__stat"><strong>20+</strong><span>years of building</span></div>
      <div className="about-strip__stat"><strong>04</strong><span>in-house divisions</span></div>
      <div className="about-strip__stat"><strong>05</strong><span>cities operated from</span></div>
      <div className="about-strip__stat"><strong>200+</strong><span>projects delivered</span></div>
    </section>

    <section className="about-principles">
      <div className="about-section-heading"><span className="section-index">01 — HOW WE WORK</span><h2>Principles we<br /><em>run through everything.</em></h2></div>
      <div className="principles-grid">
        {principles.map((principle) => <article key={principle.number} className="principle-card" data-testid={`principle-${principle.number}`}>
          <span className="principle-card__number">{principle.number}</span>
          <h3>{principle.title}</h3>
          <p>{principle.text}</p>
        </article>)}
      </div>
    </section>

    <section className="about-timeline">
      <div className="about-section-heading"><span className="section-index">02 — HOW WE GOT HERE</span><h2>Twenty years,<br /><em>told briefly.</em></h2></div>
      <ol className="timeline-list">
        {timeline.map((item, index) => <li key={item.year} className="timeline-item" data-testid={`timeline-${item.year}`}>
          <div className="timeline-year"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.year}</strong></div>
          <p>{item.event}</p>
        </li>)}
      </ol>
    </section>

    <section className="about-team">
      <div className="about-section-heading"><span className="section-index">03 — THE PEOPLE</span><h2>People behind<br /><em>the work.</em></h2></div>
      <div className="team-grid">
        {team.map((member, index) => <article key={member.name} className="team-card" data-testid={`team-${index + 1}`}>
          <div className="team-card__image"><img src={img(member.image, 900)} alt="" /></div>
          <div className="team-card__body"><span>{member.role}</span><h3>{member.name}</h3></div>
        </article>)}
      </div>
      <p className="about-team__note">Team names and portraits are being finalised — reach out via <Link to="/contact">the contact page</Link> for direct leadership introductions.</p>
    </section>

    <section className="about-cta">
      <div><span className="section-index">READY WHEN YOU ARE</span><h2>Let's build<br /><em>something together.</em></h2><p>Bring us a site, a brief, or just a stone you'd like to use. We'll take it from there.</p></div>
      <ContactTrigger className="np-btn np-btn--paper" testId="about-cta-button">START A PROJECT</ContactTrigger>
    </section>
  </main>;
}

function Preloader() {
  return <div className="preloader" aria-hidden="true" data-testid="preloader">
    <div className="preloader__brand">
      <span className="preloader__word">BDSM</span>
      <span className="preloader__line" />
      <span className="preloader__sub">BDS MARVEL · MATERIALS — STRUCTURES — INTERIORS</span>
    </div>
  </div>;
}

function App() {
  const [firstLoad] = useState(() => {
    try {
      if (sessionStorage.getItem("bdsm-visited")) return false;
      sessionStorage.setItem("bdsm-visited", "1");
      return true;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (firstLoad) document.documentElement.classList.add("first-load");
  }, [firstLoad]);
  return <BrowserRouter>
    <ContactProvider>
      {firstLoad && <Preloader />}
      <PageShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsArchive />} />
          <Route path="/projects/:slug" element={<ProjectPage />} />
          <Route path="/businesses/:slug" element={<SegmentPage />} />
          <Route path="/catalogue" element={<CataloguePage />} />
          <Route path="/experience" element={<ExperiencePage />} />
          <Route path="/stays" element={<StaysPage />} />
          <Route path="/stays/:tier" element={<StaysCategoryPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/work" element={<ProjectsArchive />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
          <Route path="/agency/:slug" element={<SegmentPage />} />
        </Routes>
      </PageShell>
    </ContactProvider>
  </BrowserRouter>;
}

export default App;
