# NebulaX 2026 Hackathon Repository

 This repository contains curated datasets and resources for participants working on various problem statements related to Land Transport Authority (LTA) NebulaX 2026 hackathon

## 📋 Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Problem Statements](#problem-statements)
  - [Problem Statement 1](#problem-statement-1-ps1)
  - [Problem Statement 2](#problem-statement-2-ps2)
  - [Problem Statement 3](#problem-statement-3-ps3)
- [LTA DataMall API](#lta-datamall-api)
- [Getting Started](#getting-started)
- [Data Formats](#data-formats)
- [Resources](#resources)

---

## 🎯 Overview

This repository provides organized datasets for hackathon participants to build innovative solutions for Singapore's public transport challenges. Each problem statement folder contains relevant data sources to help you get started quickly.

---?

## 📁 Repository Structure

```
Hackathon-Repo/
├── PS1/                          # Problem Statement 1 — Railway Track Access Optimisation
│   ├── PS1_README.md             # The participant brief (challenge, rules, scenarios, schema)
│   ├── 01_data/                  # The demand-book CSVs (9 files) for this info pack
│   ├── 02_references/            # Network diagrams
│   └── 03_submission_sample/     # Reference submission — validates feasible, 0 violations
│
├── PS2/                          # Problem Statement 2 — Smart Commuter Companion
│   ├── PS2_README.md             # The participant brief
│   ├── data/                     # Provided datasets
│   ├── references/               # Specification (.docx/.pdf) + full scoring rubric
│   ├── submission/               # How to package and hand in a submission
│   ├── generate_ps2_docx.py      # Regenerates the .docx (no dependencies)
│   └── generate_ps2_pdf.py       # Regenerates the .pdf  (no dependencies)
│
├── PS3/                          # Problem Statement 3 — Train Condition Monitoring
│   ├── 01_Problem_Statement_3_Specifications.md   # The participant brief
│   ├── 02_Datasets/               # Train/test data per subsystem (Door, ACV, Rail_Corrugation, SHM)
│   ├── 03_References/             # Per-subsystem Info Kits (background, acquisition, schema, labels)
│   └── 04_Example_Submission/     # Sample prediction CSVs — required submission format
│
└── LTA_DataMall_API_User_Guide.pdf
```

---

## 🚀 Problem Statements

### Problem Statement 1 (PS1)

**Focus Area:** Railway Track Access Optimisation

Plan nightly track possessions for the North–South and East–West lines: decide which contracted activities get access on which weeks, pack compatible work into shared possessions, respect safety buffers and deadlines — and prove the schedule against the official validator.

#### Start here:

- **`PS1/PS1_README.md`** — the participant brief (challenge, domain model, rules, scenarios, output schema, tooling, traps)
- **`PS1/01_data/`** — the demand-book CSVs (the instance) for this info pack
- **`PS1/03_submission_sample/`** — a reference submission against that instance (feasible, 0 hard violations)
- **`PS1/02_references/`** — network topology diagrams

---

### Problem Statement 2 (PS2)

**Focus Area:** Smart Commuter Companion — a mobile-first web app that helps a
Singapore commuter plan and adapt a journey around live disruptions, crowding
and weather.

- **`PS2/PS2_README.md`** — the participant brief (1. Challenge Statement, 2. Challenge Details, 3. Expectations & Goals, 4. Deliverables)
- **`PS2/data/`** — the provided datasets
- **`PS2/references/Problem_Statement_2_Specification.docx`** / **`.pdf`** — the same brief as a formatted specification document
- **`PS2/references/PS2_scoring_rubric.md`** — the full rubric: every dimension broken into sub-axes with a description at each of the five levels, plus caps and judging protocol
- **`PS2/submission/README.md`** — how to package and hand in a submission

#### Available Datasets:

- **Rail Infrastructure**

  - `AmendmenttoMP2014RailStation.geojson` - GeoJSON data of rail stations with amendments to Master Plan 2014
- **Weather Data**

  - `24hourWeatherForecast.json` - Short-term weather predictions
  - `4dayWeatherForecast.json` - Medium-term weather forecast
- **Live Updates**

  - `UsefulWebsites.txt` - Links to Telegram channels with real-time updates on:
    - Train faults
    - Service delays
    - Operational disruptions
    - Emergency notifications

#### Telegram Data Source:

- **SGMRT Telegram Channel**: [https://t.me/s/sgmrt](https://t.me/s/sgmrt?before=2527)
  - Real-time updates on MRT/LRT service status
  - Fault reports and delay notifications
  - Historical data available through message archives

#### Use Cases:

- Door-to-door journey planning across rail, bus and walking
- Rerouting around a live disruption, with the reason made clear
- Accessibility-aware routing (step-free paths, lifts, sheltered walkways)
- Crowding-aware and weather-aware recommendations
- Knowing when *not* to interrupt the commuter

---

### Problem Statement 3 (PS3)

**Focus Area:** Train Condition Monitoring Detect faults and estimate degradation across four independent rail-vehicle subsystems — door motor cycles, ACV (aircon) refrigerant leaks, rail corrugation, and structural health monitoring — from raw sensor time series, then submit predictions the organisers can score against held-out ground truth.

#### Start here:
- PS3/01_Problem_Statement_3_Specifications.md — the participant brief (challenge, the four subsystems, repository structure, data conventions, deliverables, judging rubric)
- PS3/02_Datasets/ — training and test data for each subsystem (Door, ACV, Rail_Corrugation, SHM)
- PS3/03_References/ — each subsystem's Info Kit (business background, data acquisition method, file/column schema, reference labels)
- PS3/04_Example_Submission/ — sample prediction CSVs, showing the required submission format

#### Quick start: 
Each subsystem is self-contained with its own task, dataset and Info Kit — teams can go deep on one or attempt several (the more attempted, the higher the score). The documents brief exactly what's scored, so teams validate their own outputs against the schema shown in 04_Example_Submission/ before packaging them into predictions.zip.

#### Use Cases:
- Temporal segment detection and binary classification — flag abnormal-resistance door-open/close cycles from door sensor data
- Fault localisation — pinpoint which car has a refrigerant leak from cabin/ambient temperature and control-mode telemetry
- Multi-class classification — distinguish Normal vs. Side I vs. Side II rail corrugation from multi-channel axle-box vibration and shock data
- Regression — estimate cumulative fatigue damage from dynamic stress time series

---

## 🔌 LTA DataMall API

All participants have access to the **LTA DataMall API** for real-time transport data.

### 📖 Documentation

Refer to `LTA_DataMall_API_User_Guide.pdf` for comprehensive API documentation.

### 🌐 API Base URL

```
https://datamall2.mytransport.sg/ltaodataservice/
```

### 🔑 Getting Started with the API

1. **Register for API Access**

   - Visit [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en.html)
   - Create an account and obtain your API key (AccountKey)
2. **Available Endpoints** (Examples)

   - **Bus Arrival**: `v3/BusArrival?BusStopCode={code}`
   - **Bus Services**: `BusServices`
   - **Bus Stops**: `BusStops`
   - **Bus Routes**: `BusRoutes`
   - **Taxi Availability**: `Taxi-Availability`
   - **Traffic Incidents**: `TrafficIncidents`
   - And many more...
3. **Sample API Call**

   **Using cURL:**

   ```bash
   curl -X GET "https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=83139" \
     -H "AccountKey: YOUR_API_KEY_HERE"
   ```

### 📊 Real-Time Data Available:

- Bus arrival times
- Bus services and routes
- Bus stop locations
- Taxi availability
- Carpark availability
- Traffic incidents
- Road works
- Traffic speed bands
- And more...

## 📄 Data Formats

### JSON Files

- Weather forecast data in standard JSON format
- Structured with metadata and value arrays
- Timestamps in ISO 8601 format

### GeoJSON Files

- Rail station data with geographic coordinates
- Compatible with mapping libraries (Leaflet, Mapbox, Google Maps)
- Contains feature properties and geometry

### API Responses

- JSON format with OData metadata
- Paginated results for large datasets
- Real-time data with timestamps

---

## 📚 Resources

### Official Documentation

- [LTA DataMall Portal](https://datamall.lta.gov.sg/content/datamall/en.html)
- [LTA DataMall API User Guide](./LTA_DataMall_API_User_Guide.pdf)
- [Data.gov.sg](https://data.gov.sg/) - Singapore's open data portal with additional transport, weather, and infrastructure datasets

### Live Data Sources

- [SGMRT Telegram Channel](https://t.me/s/sgmrt) - Real-time MRT/LRT updates

### Useful Tools

- **JSON Viewers**: [jsonviewer.stack.hu](http://jsonviewer.stack.hu/)
- **GeoJSON Viewers**: [geojson.io](http://geojson.io/)
- **API Testing**: [Postman](https://www.postman.com/), [Insomnia](https://insomnia.rest/)
- **

### Weather Data Sources

- Singapore Meteorological Service
- NEA Weather API (if applicable)

---

## 💡 Tips for Participants

1. **Start with the API**: Familiarize yourself with the LTA DataMall API early
2. **Understand the Data**: Spend time exploring the dataset structures
3. **Think Real-time**: Consider how to integrate live data feeds
4. **Weather Integration**: Many problems benefit from weather correlation
5. **User-Centric**: Focus on solving real user pain points
6. **Scalability**: Design solutions that can handle Singapore's transport scale
7. **Scoring**: Read each of your PS specifications to understand what you would be scored on

---

## 🤝 Support

For questions about:

- **Datasets**: Review the data files and API documentation
- **API Access**: Visit [LTA DataMall Support](https://datamall.lta.gov.sg/content/datamall/en/contact-us.html)
- **Problem Statements**: Consult with hackathon organizers

!!! Mentors will be around on to help

!!! Email LTA_XX_ title your queries with [PS#] Your Question

Standard Template for PS folders:

- PSX_README.md
- data folder
- reference folder (where you store things that are for their reference/reading)
- submission folder (if needed)

---

## 📝 License

Please refer to LTA DataMall's terms of use for API data usage guidelines.

---

## 🎉 Good Luck!

We're excited to see what innovative solutions you'll build with these datasets. Happy hacking! 🚀

---
