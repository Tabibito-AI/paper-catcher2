# Paper Catcher
Paper Catcher is a web application that automatically collects academic papers, summarizes and translates them into Japanese. It retrieves papers related to user-defined keywords via various APIs, creates Japanese translations using the Gemini API, and automatically updates a GitHub Pages site.

## Features
- **Automatic Paper Collection**: Automatically collects papers based on configured keywords
- **Japanese Translation**: Translates paper titles and abstracts into Japanese
- **Category Classification**: Classifies papers into categories (e.g., "Education & Labor Economics" and "General Economics")
- **Various Sorting Options**: Sort by registration date, retrieval order, journal, or publication date
- **Archive Function**: View past papers in an archive
- **Mobile Compatibility**: Responsive design allows comfortable browsing on smartphones and tablets

## Setup
### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- GitHub account
- Google Cloud Platform account (for Gemini API)

### Installation Steps
1. Clone the repository
```bash
git clone https://github.com/yourusername/econ-paper-catcher.git
cd econ-paper-catcher
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the project root directory and add the following content:
```
GEMINI_API_KEY=your_gemini_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
```

4. Launch the application
```bash
npm start
```

### Deploying to GitHub Pages
1. Update the `homepage` field in `package.json` with your GitHub username and repository name
```json
"homepage": "https://yourusername.github.io/econ-paper-catcher/"
```

2. Deploy to GitHub Pages
```bash
npm run deploy
```

### About GitHub Pages Deployment
Deployment to GitHub Pages could not be completed automatically due to security issues. As the repository owner, you can complete the deployment using these steps:
1. Access your GitHub repository page
2. Select "Settings" → "Pages"
3. Select "GitHub Actions" as the source
4. Choose "Static HTML" from the provided workflow templates to deploy

## Setting Up Automatic Updates
This application uses GitHub Actions to automatically collect papers daily and update the webpage.

### GitHub Actions Configuration
1. From the repository's "Settings" tab, select "Secrets and variables" → "Actions"
2. Add the following secrets:
   - `GEMINI_API_KEY`: Gemini API key
   - `AWS_ACCESS_KEY_ID`: AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: AWS Secret Access Key
   - `AWS_REGION`: AWS Region

## Customization
### Changing Collection Keywords
Edit the `keywords` array in the `app.mjs` file to set the keywords you want to collect:
```javascript
const keywords = [
  { term: "education economics", category: "教育・労働経済学" },
  { term: "labor economics", category: "教育・労働経済学" },
  { term: "economic growth", category: "経済学一般" },
  // Add other keywords
];
```

### Adding/Changing Categories
1. Define categories in the `keywords` array in the `app.mjs` file
2. Add category buttons to the `.filter-buttons` section in the `index.html` file:
```html
<div class="filter-buttons">
  <button class="filter-btn active">教育・労働経済学</button>
  <button class="filter-btn">経済学一般</button>
  <button class="filter-btn">New Category</button>
</div>
```

## Usage
### Browsing Papers
1. When you access the webpage, the latest papers are displayed
2. Select categories using the filter buttons at the top
3. Change the display order using the sort buttons:
   - 📅 Registration Date: Order by the date papers were registered in the system
   - ≡ Retrieval Order: Order by the sequence papers were retrieved
   - 📚 By Journal: Alphabetical order by journal name
   - ⏱ By Publication Date: Order by paper publication date
   - 📚 Archive: Display all papers

### Displaying Paper Details
Click the "Details" button on a paper card to display detailed information in a modal window:
- Paper title (English and Japanese)
- Author information
- Journal name
- Link to the paper (if available)
- Abstract (English and Japanese)

## Architecture
Econ Paper Catcher consists of the following components:

1. **Backend (Node.js)**:
   - `app.mjs`: Main application logic
   - `webScraper.js`: Scraping paper information

2. **Frontend (HTML/CSS/JavaScript)**:
   - `index.html`: Main HTML file
   - `styles.css`: Stylesheet
   - `src/index.js`: Frontend JavaScript logic

3. **Build Tools**:
   - Webpack: JavaScript bundling

4. **Deployment**:
   - GitHub Pages: Static website hosting
   - GitHub Actions: Automated update workflow

## API Integration
This application uses the following APIs:

1. **Academic Paper APIs**:
   - arXiv API
   - Semantic Scholar API
   - CrossRef API

2. **Translation API**:
   - Google Gemini API: Translating paper titles and abstracts

## Troubleshooting
### If Papers Are Not Updated
1. Check GitHub Actions logs for errors
2. Verify API keys are correctly set in the `.env` file
3. Check your internet connection

### If Deployment Fails
1. Verify the `homepage` field in `package.json` is correctly set
2. Check if GitHub Pages is enabled (repository "Settings" → "Pages")
3. Verify GitHub Actions permissions are correctly set

## License
This project is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing
Bug reports and feature requests are accepted through GitHub Issues. Pull requests are also welcome.

## Acknowledgments
This project depends on the following open-source libraries and APIs:
- Node.js
- Webpack
- arXiv API
- Semantic Scholar API
- CrossRef API
- Google Gemini API

## Contact
If you have questions or suggestions, please create an issue on GitHub.
