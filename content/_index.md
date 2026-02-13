---
title: ''
summary: ''
date: 2022-10-24
type: landing

design:
  spacing: '2rem'

sections:
  - block: resume-biography-3
    id: about
    content:
      username: admin
      text: ''
      button:
        text: Download CV
        url: uploads/resume.pdf
    design:
      avatar:
        size: xl
        shape: circle
      spacing:
        padding: ['80px', '0', '60px', '0']
      background:
        gradient_mesh:
          enable: true

  - block: markdown
    id: research
    content:
      title: 'Research Areas'
      text: |-
        My research investigates the intersection of **technology, innovation, and corporate governance** through an accounting and management lens, contributing to understanding how organizations navigate digital transformation and sustainability challenges.

        ## Key Focus Areas

        ### 🔒 Information Security & Cybersecurity
        Examining corporate disclosure practices, investment efficiency, and the impact of cybersecurity on firm performance and stakeholder value.

        ### 🌱 ESG & Sustainability
        Analyzing how environmental, social, and governance initiatives affect corporate strategy, innovation, and financial outcomes in the context of climate change and carbon neutrality.

        ### 💡 Innovation & R&D Management
        Investigating R&D performance, technology commercialization, and innovation efficiency across industries using advanced analytical methods including machine learning.

        ### 📊 Technology Management
        Exploring the role of technology in organizational decision-making, performance management systems, and digital transformation strategies.

        ---

        With **35+ peer-reviewed publications** in leading journals including *Technology Analysis & Strategic Management*, *Journal of Cleaner Production*, and *Business Strategy and the Environment*, my research bridges academic rigor with practical insights for organizations and policymakers.
    design:
      columns: '1'
      background:
        color: 'white'
      spacing:
        padding: ['60px', '0', '60px', '0']

  - block: collection
    id: featured
    content:
      title: Featured Publications
      subtitle: ''
      text: ''
      filters:
        folders:
          - publication
        featured_only: true
    design:
      view: article-grid
      columns: 3
      background:
        color: '#f8f9fa'
      spacing:
        padding: ['60px', '0', '40px', '0']

  - block: collection
    id: publications
    content:
      title: Recent Publications
      subtitle: '[View complete list on Google Scholar →](https://scholar.google.com/citations?user=YOUR_ID)'
      text: ''
      filters:
        folders:
          - publication
        exclude_featured: false
      count: 9
      sort_by: 'Date'
      sort_ascending: false
    design:
      view: article-grid
      columns: 3
      background:
        color: '#f8f9fa'
      spacing:
        padding: ['20px', '0', '60px', '0']

  - block: markdown
    id: contact
    content:
      title: 'Contact'
      text: |-
        ## Get in Touch

        I welcome collaboration opportunities and inquiries from prospective students interested in technology management, innovation accounting, and sustainability research.

        ---

        **Dr. Chungwon Woo**
        Associate Professor of Accounting
        Department of Accounting
        Changwon National University

        📍 **Office:** 21323, 20 Changwondaehak-ro, Uichang-gu
        Changwon, Gyeongnam, 51140, Republic of Korea

        ✉️ **Email:** [woocw@changwon.ac.kr](mailto:woocw@changwon.ac.kr)

        🔗 **Links:**
        [Google Scholar](https://scholar.google.com/citations?user=YOUR_ID) • [GitHub](https://github.com/woocw3) • [Download CV](uploads/resume.pdf)
    design:
      columns: '1'
      background:
        color: white
      spacing:
        padding: ['60px', '0', '80px', '0']
---
