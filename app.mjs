import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { parseStringPromise } from 'xml2js';
import WebScraper from './webScraper.js';

dotenv.config();

// 環境変数のフォールバック機能
function getEnvWithFallback(key, fallbackValue = '') {
    const value = process.env[key];
    if (value && value.trim() !== '') {
        return value;
    }

    // .envファイルから直接読み込みを試行
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith(`${key}=`)) {
                    const envValue = trimmedLine.substring(key.length + 1);
                    if (envValue && envValue.trim() !== '') {
                        console.log(`Using fallback value for ${key} from .env file`);
                        return envValue;
                    }
                }
            }
        }
    } catch (error) {
        console.warn(`Failed to read .env file for ${key}:`, error.message);
    }

    return fallbackValue;
}

// キーワード専用の関数（.envファイルを優先）
function getKeywordWithEnvPriority(key, fallbackValue = '') {
    // まず.envファイルから読み込みを試行
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith(`${key}=`)) {
                    const envValue = trimmedLine.substring(key.length + 1);
                    if (envValue && envValue.trim() !== '') {
                        console.log(`Using ${key} from .env file: ${envValue}`);
                        return envValue;
                    }
                }
            }
        }
    } catch (error) {
        console.warn(`Failed to read .env file for ${key}:`, error.message);
    }

    // .envファイルで見つからない場合は環境変数を確認
    const value = process.env[key];
    if (value && value.trim() !== '') {
        console.log(`Using ${key} from environment variables: ${value}`);
        return value;
    }

    return fallbackValue;
}

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// キーワード管理のためのヘルパー関数（.envファイルを優先）
function getKeywordsQuery() {
    const keyword1 = getKeywordWithEnvPriority('KEYWORD1', 'machinelearning');
    const keyword2 = getKeywordWithEnvPriority('KEYWORD2', '');

    if (keyword2) {
        return `"${keyword1}" OR "${keyword2}"`;
    }
    return `"${keyword1}"`;
}

class RateLimiter {
    constructor(requestsPerMinute, maxRetries = 1) {
        this.requestsPerMinute = requestsPerMinute;
        this.maxRetries = maxRetries;
        this.queue = [];
        this.processing = false;
        this.lastRequestTime = {};
        this.retryCount = {};
    }

    async addToQueue(fn, apiKey) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject, apiKey });
            this.processQueue();
        });
    }

    calculateBackoff(retryCount) {
        const jitter = Math.random() * 1000;
        return Math.min(Math.pow(2, retryCount) * 2000 + jitter, 50000);
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const { fn, resolve, reject, apiKey } = this.queue.shift();
        const now = Date.now();
        const lastRequest = this.lastRequestTime[apiKey] || 0;
        const timeSinceLastRequest = now - lastRequest;
        const minDelay = (60 * 1000) / this.requestsPerMinute;

        if (timeSinceLastRequest < minDelay) {
            await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
        }

        try {
            const result = await this.executeWithRetry(fn, apiKey);
            this.lastRequestTime[apiKey] = Date.now();
            this.retryCount[apiKey] = 0;
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            setTimeout(() => this.processQueue(), 100);
        }
    }

    async executeWithRetry(fn, apiKey, retryCount = 0) {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            if ((error.status === 429 || error.status === 503 || error.status === 401) && retryCount < this.maxRetries) {
                const backoffTime = this.calculateBackoff(retryCount);
                console.log(`API error for ${apiKey}. Status: ${error.status}. Retrying in ${backoffTime / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                return this.executeWithRetry(fn, apiKey, retryCount + 1);
            }
            throw error;
        }
    }
}

const geminiLimiter = new RateLimiter(8);
const apiLimiter = new RateLimiter(20);
const webScraper = new WebScraper();

class ArxivClient {
    constructor(config = {}) {
        // .envファイルから共通キーワードを取得
        const searchTerms = config.searchQuery || getKeywordsQuery();
        this.searchQuery = `abs:${searchTerms} OR ti:${searchTerms}`;
        this.maxRetries = config.maxRetries || 1;
        this.baseDelay = config.baseDelay || 2000;
        this.timeout = config.timeout || 30000;
        
        console.log('arXiv initialized with query:', this.searchQuery);
    }

    async fetchArxivPapers(maxResults = 20) {
        const apiUrl = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(this.searchQuery)}&start=0&max_results=${maxResults}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`arXiv API request failed with status ${response.status}`);
            }
            const xmlData = await response.text();

            const result = await parseStringPromise(xmlData);

            const entries = result.feed.entry || [];
            const papers = await Promise.all(entries.map(async entry => {
                const paper = {
                    id: entry.id[0],
                    title: entry.title[0].trim(),
                    summary: entry.summary[0].trim(),
                    published: entry.published[0],
                    updated: entry.updated[0],
                    authors: entry.author ? entry.author.map(author => author.name[0]) : [],
                    categories: entry.category ? entry.category.map(cat => cat.$.term) : [],
                    link: entry.link ? entry.link.find(link => link.$.rel === 'alternate')?.$.href : null,
                };

                if (!paper.summary && paper.link) {
                    paper.summary = await webScraper.scrapeAbstractFromUrl(paper.link) || 'No abstract available';
                }

                return paper;
            }));

            console.log('Fetched papers from arXiv:', papers);

            return papers.map(paper => ({
                title: paper.title,
                author: paper.authors.join(', '),
                publicationDate: paper.published,
                abstract: paper.summary,
                journal: 'arXiv',
                doi: paper.id,
                link: paper.link,
            }));
        } catch (error) {
            console.error('Error fetching arXiv papers:', error);
            throw error;
        }
    }
}

class SpringerClient {
    constructor() {
        this.apiKey = getEnvWithFallback('SPRINGER_API_KEY');

        // .envファイルから共通キーワードを取得（.envファイル優先）
        const keyword1 = getKeywordWithEnvPriority('KEYWORD1', 'machinelearning');
        const keyword2 = getKeywordWithEnvPriority('KEYWORD2', '');

        if (keyword2) {
            this.searchQuery = `(keyword:"${keyword1}" OR keyword:"${keyword2}")`;
        } else {
            this.searchQuery = `(keyword:"${keyword1}")`;
        }

        if (!this.apiKey) {
            console.warn('Warning: SPRINGER_API_KEY not set in environment variables or .env file');
            throw new Error('Springer API key is not set');
        }
    }

    async fetchSpringerPapers(maxResults = 20) {
        const apiUrl = `https://api.springernature.com/metadata/json?api_key=${this.apiKey}&q=${encodeURIComponent(this.searchQuery)}&p=${maxResults}&s=1`;

        console.log('Request URL:', apiUrl);

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Springer API request failed with status ${response.status}`);
            }
            const jsonData = await response.json();

            const records = jsonData.records || [];
            const papers = await Promise.all(records.map(async record => {
                const paper = {
                    id: record.doi,
                    title: record.title,
                    summary: record.abstract || 'No abstract available',
                    published: record.publicationDate,
                    authors: record.creators ? record.creators.map(creator => creator.creator) : [],
                    categories: record.subjects ? record.subjects.map(subject => subject.subject) : [],
                    link: record.url || `https://doi.org/${record.doi}`,
                    journal: record.publicationName || 'Springer',
                };

                if (!paper.summary && paper.link) {
                    paper.summary = await webScraper.scrapeAbstractFromUrl(paper.link) || 'No abstract available';
                }

                return paper;
            }));

            console.log('Fetched papers from Springer:', papers);

            return papers.map(paper => ({
                title: paper.title,
                author: paper.authors.join(', '),
                publicationDate: paper.published,
                abstract: paper.summary,
                journal: paper.journal,
                doi: paper.id,
                link: paper.link,
            }));
        } catch (error) {
            console.error('Error fetching Springer papers:', error);
            throw error;
        }
    }
}

class SemanticScholarClient {
    constructor(config = {}) {
        // .envファイルから共通キーワードを取得
        this.searchQuery = config.searchQuery || getKeywordsQuery();
        this.requestsPerMinute = 50;
        this.lastRequestTime = 0;
        this.maxRetries = config.maxRetries || 1;
        this.baseDelay = config.baseDelay || 2000;
        this.timeout = config.timeout || 30000;
        
        console.log('SemanticScholar initialized with query:', this.searchQuery);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = (60 * 1000) / this.requestsPerMinute;

        if (timeSinceLastRequest < minDelay) {
            await this.sleep(minDelay - timeSinceLastRequest);
        }
        this.lastRequestTime = Date.now();
    }

    async fetchWithRetry(url, options = {}, retryCount = 0) {
        const maxRetries = 2;
        const baseDelay = 2000;

        try {
            await this.enforceRateLimit();

            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 429 && retryCount < maxRetries) {
                    const retryAfter = response.headers.get('Retry-After');
                    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 :
                        baseDelay * Math.pow(2, retryCount);
                    console.warn(`Rate limited. Retrying after ${delay}ms...`);
                    await this.sleep(delay);
                    return this.fetchWithRetry(url, options, retryCount + 1);
                }
                throw new Error(`Semantic Scholar API request failed with status ${response.status}`);
            }
            return response;
        } catch (error) {
            if (retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.warn(`Request failed. Retrying after ${delay}ms...`);
                await this.sleep(delay);
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    async fetchSemanticScholarPapers(maxResults = 20) {
        const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(this.searchQuery)}&limit=${maxResults}&sort=published`;

        try {
            const response = await this.fetchWithRetry(apiUrl);
            const jsonData = await response.json();

            const papers = jsonData.data || [];
            const detailedPapers = await Promise.all(papers.map(async paper => {
                const paperDetails = await this.fetchPaperDetails(paper.paperId);
                const paperInfo = {
                    id: paper.paperId,
                    title: paper.title,
                    abstract: paperDetails.abstract || 'No abstract available',
                    published: paperDetails.year ? new Date(paperDetails.year, 0, 1).toISOString() : 'No publication date available',
                    authors: paperDetails.authors ? paperDetails.authors.map(author => author.name) : [],
                    journal: paperDetails.venue || 'No journal available',
                    doi: paperDetails.doi || null,
                    link: paperDetails.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
                };

                if (!paperInfo.abstract && paperInfo.link) {
                    paperInfo.abstract = await webScraper.scrapeAbstractFromUrl(paperInfo.link) || 'No abstract available';
                }

                return paperInfo;
            }));

            console.log('Fetched papers from Semantic Scholar:', detailedPapers);

            return detailedPapers.map(paper => ({
                title: paper.title,
                author: paper.authors.join(', '),
                publicationDate: paper.published,
                abstract: paper.abstract,
                journal: paper.journal,
                doi: paper.doi,
                link: paper.link,
            }));
        } catch (error) {
            console.error('Error fetching Semantic Scholar papers:', error);
            throw error;
        }
    }

    async fetchPaperDetails(paperId) {
        const apiUrl = `https://api.semanticscholar.org/v1/paper/${paperId}`;

        try {
            const response = await this.fetchWithRetry(apiUrl);
            return await response.json();
        } catch (error) {
            console.error('Error fetching paper details from Semantic Scholar:', error);
            throw error;
        }
    }
}

class PubMedClient {
    constructor() {
        this.apiKey = getEnvWithFallback('PUBMED_API_KEY');

        // .envファイルから共通キーワードを取得（.envファイル優先）
        const keyword1 = getKeywordWithEnvPriority('KEYWORD1', 'machinelearning');
        const keyword2 = getKeywordWithEnvPriority('KEYWORD2', '');

        let searchTerms = '';
        if (keyword2) {
            searchTerms = `("${keyword1}"[Title/Abstract] OR "${keyword2}"[Title/Abstract])`;
        } else {
            searchTerms = `("${keyword1}"[Title/Abstract])`;
        }

        this.searchQuery = `${searchTerms} AND ("2023"[Date - Publication] : "3000"[Date - Publication])`;
    }

    async fetchWithRetry(url, options = {}, retryCount = 0) {
        const maxRetries = 3;
        const baseDelay = 400;

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 429 && retryCount < maxRetries) {
                    const retryAfter = response.headers.get('Retry-After') || baseDelay * Math.pow(2, retryCount);
                    console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter));
                    return this.fetchWithRetry(url, options, retryCount + 1);
                }
                throw new Error(`PubMed API request failed with status ${response.status}`);
            }
            return response;
        } catch (error) {
            if (retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.warn(`Request failed. Retrying after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    async fetchPubMedPapers(maxResults = 20) {
        const apiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(this.searchQuery)}&retmax=${maxResults}&sort=pubdate&api_key=${this.apiKey}`;

        try {
            const response = await this.fetchWithRetry(apiUrl);
            const xmlData = await response.text();

            const result = await parseStringPromise(xmlData);

            const paperIds = result.eSearchResult?.IdList?.[0]?.Id || [];

            const papers = [];
            for (const id of paperIds) {
                try {
                    const paperDetails = await this.fetchPaperDetails(id);
                    const paper = {
                        id: id,
                        title: paperDetails.title || 'No title available',
                        abstract: paperDetails.abstract || 'No abstract available',
                        published: paperDetails.published || 'No publication date available',
                        authors: paperDetails.authors || [],
                        journal: paperDetails.journal || 'No journal available',
                        doi: paperDetails.doi || null,
                        link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
                    };

                    if (!paper.abstract && paper.link) {
                        console.log(`Attempting to scrape abstract from ${paper.link}`);
                        paper.abstract = await webScraper.scrapeAbstractFromUrl(paper.link) || 'No abstract available';
                        console.log(`Scraping result for ${paper.link}:`, paper.abstract !== 'No abstract available' ? 'Success' : 'Failed');
                    }

                    papers.push(paper);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
                } catch (error) {
                    console.error(`Error fetching details for PubMed paper ${id}:`, error);
                }
            }

            console.log('Fetched papers from PubMed:', papers);

            return papers.map(paper => ({
                title: paper.title,
                author: paper.authors.join(', '),
                publicationDate: paper.published,
                abstract: paper.abstract,
                journal: paper.journal,
                doi: paper.doi,
                link: paper.link,
            }));
        } catch (error) {
            console.error('Error fetching PubMed papers:', error);
            throw error;
        }
    }

    async fetchPaperDetails(pmid) {
        const apiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml&api_key=${this.apiKey}`;

        try {
            const response = await this.fetchWithRetry(apiUrl);
            const xmlData = await response.text();

            const result = await parseStringPromise(xmlData);
            const article = result.PubmedArticleSet?.PubmedArticle?.[0]?.MedlineCitation?.[0]?.Article?.[0];

            if (!article) {
                console.warn(`No article data found for PubMed ID ${pmid}`);
                return {
                    title: 'No title available',
                    abstract: 'No abstract available',
                    published: 'No publication date available',
                    authors: [],
                    journal: 'No journal available',
                    doi: null
                };
            }

            const abstractText = article.Abstract?.[0]?.AbstractText || [];
            let abstract = '';
            if (Array.isArray(abstractText)) {
                abstract = abstractText.map(item => {
                    if (typeof item === 'string') {
                        return item;
                    } else if (item._ && item.$ && item.$.Label) {
                        return `${item.$.Label}: ${item._}`;
                    } else if (item._) {
                        return item._;
                    }
                    return '';
                }).join('\n');
            } else {
                abstract = abstractText.toString();
            }

            const authorList = article.AuthorList?.[0]?.Author || [];
            const authors = authorList.map(author => {
                const lastName = author.LastName?.[0] || '';
                const foreName = author.ForeName?.[0] || '';
                const initials = author.Initials?.[0] || '';
                return `${lastName}${foreName ? ' ' + foreName : ''}${!foreName && initials ? ' ' + initials : ''}`;
            });

            const journal = article.Journal?.[0]?.Title?.[0] || 'No journal available';
            const pubDate = article.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0];
            let published = 'No publication date available';
            if (pubDate) {
                const year = pubDate.Year?.[0] || '';
                const month = pubDate.Month?.[0] || '';
                const day = pubDate.Day?.[0] || '';
                published = `${year}${month ? '-' + month : ''}${day ? '-' + day : ''}`;
            }

            const articleIdList = result.PubmedArticleSet?.PubmedArticle?.[0]?.PubmedData?.[0]?.ArticleIdList?.[0]?.ArticleId || [];
            const doi = articleIdList.find(id => id.$ && id.$.IdType === 'doi')?._  || null;

            return {
                title: article.ArticleTitle?.[0] || 'No title available',
                abstract: abstract || 'No abstract available',
                published,
                authors,
                journal,
                doi
            };
        } catch (error) {
            console.error(`Error fetching details for PubMed paper ${pmid}:`, error);
            throw error;
        }
    }
}

class CrossRefClient {
    constructor(config = {}) {
        // .envファイルから共通キーワードを取得
        this.searchQuery = config.searchQuery || getKeywordsQuery();
        this.maxRetries = config.maxRetries || 1;
        this.baseDelay = config.baseDelay || 2000;
        this.timeout = config.timeout || 30000;
        
        console.log('CrossRef initialized with query:', this.searchQuery);
    }

    async fetchCrossRefPapers(searchQuery = null, maxResults = 20) {
        const query = searchQuery || this.searchQuery;
        const apiUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${maxResults}&sort=published&order=desc`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`CrossRef API request failed with status ${response.status}`);
            }
            const jsonData = await response.json();

            const items = jsonData.message?.items || [];
            const papers = await Promise.all(items.map(async item => {
                const paper = {
                    id: item.DOI,
                    title: Array.isArray(item.title) ? item.title[0] : (item.title || 'No title available'),
                    summary: 'Abstract not available in CrossRef API',
                    published: item.published ? item.published['date-parts'][0].join('-') : 'No publication date available',
                    authors: item.author ? item.author.map(author => `${author.family || ''}${author.given ? ', ' + author.given : ''}`) : [],
                    journal: item['container-title'] ? item['container-title'][0] : 'No journal available',
                    link: `https://doi.org/${item.DOI}`,
                };

                // Try to fetch abstract from the DOI link
                if (paper.link) {
                    paper.summary = await webScraper.scrapeAbstractFromUrl(paper.link) || 'No abstract available';
                }

                return paper;
            }));

            console.log('Fetched papers from CrossRef:', papers);

            return papers.map(paper => ({
                title: paper.title,
                author: paper.authors.join(', '),
                publicationDate: paper.published,
                abstract: paper.summary,
                journal: paper.journal,
                doi: paper.id,
                link: paper.link,
            }));
        } catch (error) {
            console.error('Error fetching CrossRef papers:', error);
            throw error;
        }
    }
}

class ScopusClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey;

        // .envファイルから共通キーワードを取得
        const keyword1 = process.env.KEYWORD1 || 'machinelearning';
        const keyword2 = process.env.KEYWORD2 || '';

        if (keyword2) {
            this.searchQuery = `${keyword1} OR ${keyword2}`;
        } else {
            this.searchQuery = keyword1;
        }

        this.maxRetries = config.maxRetries || 1;
        this.baseDelay = config.baseDelay || 2000;
        this.timeout = config.timeout || 30000;

        console.log('Scopus initialized with query:', this.searchQuery);
    }
}

// Gemini翻訳クライアント
class GeminiTranslator {
    constructor() {
        this.apiKey = getEnvWithFallback('GEMINI_API_KEY');
        this.translationEnabled = !!this.apiKey;

        console.log('=== Gemini Translator Initialization ===');
        console.log(`GEMINI_API_KEY exists: ${!!this.apiKey}`);
        if (this.apiKey) {
            console.log(`GEMINI_API_KEY length: ${this.apiKey.length}`);
            console.log(`GEMINI_API_KEY preview: ${this.apiKey.substring(0, 10)}...`);
        }
        console.log(`Translation enabled: ${this.translationEnabled}`);

        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY is not set in environment variables or .env file. Translation will be skipped.');
            return;
        }

        try {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                ],
            });
        } catch (error) {
            console.warn('Failed to initialize Gemini API:', error.message);
            this.translationEnabled = false;
        }
    }

    async translateText(text, targetLanguage = 'Japanese') {
        if (!text || text.trim() === '') {
            return '';
        }

        if (!this.translationEnabled) {
            console.log('Translation skipped (API key not available)');
            return text; // Return original text if translation is disabled
        }

        try {
            const prompt = `Please translate the following academic text to ${targetLanguage}. Keep the translation natural and academic in tone. Only return the translation without any additional text or explanations:\n\n${text}`;

            const result = await geminiLimiter.addToQueue(async () => {
                return await this.model.generateContent(prompt);
            }, this.apiKey);

            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('Translation error:', error);
            return text; // Return original text if translation fails
        }
    }

    async translatePaper(paper) {
        try {
            if (!this.translationEnabled) {
                console.log(`Skipping translation for paper: ${paper.title.substring(0, 50)}... (API key not available)`);
                return {
                    ...paper,
                    translatedTitle: paper.title,
                    translatedAbstract: paper.abstract
                };
            }

            console.log(`Translating paper: ${paper.title.substring(0, 50)}...`);

            const [translatedTitle, translatedAbstract] = await Promise.all([
                this.translateText(paper.title),
                this.translateText(paper.abstract)
            ]);

            return {
                ...paper,
                translatedTitle,
                translatedAbstract
            };
        } catch (error) {
            console.error('Error translating paper:', error);
            return {
                ...paper,
                translatedTitle: paper.title,
                translatedAbstract: paper.abstract
            };
        }
    }
}

// HTML生成クライアント
class HTMLGenerator {
    constructor() {
        this.templatePath = './template_1.html';
    }

    async generateHTML(papers, filename = 'index.html') {
        try {
            console.log(`Generating ${filename} with ${papers.length} papers...`);

            // デフォルトテンプレートを使用
            const template = this.getDefaultTemplate();

            // 論文を日付別にグループ化
            const groupedPapers = this.groupPapersByDate(papers);

            // 日付セクション別にHTMLを生成
            const sectionsHTML = Object.entries(groupedPapers)
                .sort(([a], [b]) => new Date(b) - new Date(a)) // 新しい日付順
                .map(([date, datePapers]) => {
                    const formattedDate = this.formatDateHeader(date);
                    const papersHTML = datePapers.map(paper => this.generatePaperCard(paper)).join('\n');

                    return `
            <section class="date-section">
                <h2 class="date-header">${formattedDate}</h2>
                ${papersHTML}
            </section>`;
                }).join('\n');

            // テンプレートに論文データを挿入
            const html = template.replace('{{PAPERS_CONTENT}}', sectionsHTML);

            // HTMLファイルを保存
            fs.writeFileSync(filename, html, 'utf8');
            console.log(`Successfully generated ${filename}`);

            return filename;
        } catch (error) {
            console.error(`Error generating ${filename}:`, error);
            throw error;
        }
    }

    generatePaperCard(paper) {
        const {
            title,
            translatedTitle,
            author,
            publicationDate,
            abstract,
            translatedAbstract,
            journal,
            doi,
            link
        } = paper;

        // タイトルは原題のまま表示、抄録は翻訳版を優先
        const displayAbstract = translatedAbstract || abstract;
        const formattedDate = this.formatDate(publicationDate);

        return `
            <article class="paper-item">
                <h3 class="paper-title">${this.escapeHtml(title)}</h3>

                <div class="paper-translation">
                    <p>${this.escapeHtml(displayAbstract.substring(0, 300))}${displayAbstract.length > 300 ? '...' : ''}</p>
                </div>

                <div class="paper-meta">
                    <span class="publication-date">${formattedDate}</span>
                    <a href="#" class="twitter-link">Xへの投稿</a>
                    <a href="${this.escapeHtml(link || '#')}" target="_blank" class="paper-link">論文を開く</a>
                    <button class="details-btn"
                        data-title="${this.escapeHtml(title)}"
                        data-translated-title="${this.escapeHtml(translatedTitle || '')}"
                        data-authors="${this.escapeHtml(author || 'Unknown')}"
                        data-journal="${this.escapeHtml(journal || 'Unknown')}"
                        data-date="${formattedDate}"
                        data-abstract="${this.escapeHtml(abstract || 'No abstract available')}"
                        data-translated-abstract="${this.escapeHtml(translatedAbstract || '')}"
                        data-url="${this.escapeHtml(link || '#')}">詳細</button>
                </div>
            </article>`;
    }

    categorizeKeyword(text) {
        const lowerText = text.toLowerCase();

        // キーワードベースの分類
        const keyword1 = (process.env.KEYWORD1 || 'machinelearning').toLowerCase();
        const keyword2 = (process.env.KEYWORD2 || '').toLowerCase();

        if (keyword2 && lowerText.includes(keyword2)) {
            return 'category2';
        } else if (lowerText.includes(keyword1)) {
            return 'category1';
        }

        return 'general';
    }

    groupPapersByDate(papers) {
        const grouped = {};

        papers.forEach(paper => {
            const date = paper.publicationDate || new Date().toISOString().split('T')[0];
            const dateKey = date.split('T')[0]; // YYYY-MM-DD format

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(paper);
        });

        return grouped;
    }

    formatDate(dateString) {
        if (!dateString) return '不明';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP');
        } catch (error) {
            return dateString;
        }
    }

    formatDateHeader(dateString) {
        if (!dateString) return '不明な日付';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    escapeHtml(text) {
        if (!text) return '';

        // Convert to string if it's not already
        const textStr = Array.isArray(text) ? text.join(', ') : String(text);

        return textStr
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getDefaultTemplate() {
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paper Catcher</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="title">Paper Catcher</h1>
            <p class="subtitle">最新の論文を自動収集・翻訳してお届けします</p>
        </header>

        <nav class="navigation">
            <a href="#" class="nav-link active" data-view="registration">📅 登録日付順</a>
            <a href="#" class="nav-link" data-view="journal">📚 ジャーナル別</a>
            <a href="#" class="nav-link" data-view="publication">⏱ 出版日別</a>
            <a href="#" class="nav-link" data-view="archive">📚 アーカイブ</a>
        </nav>

        <main class="main-content">
            {{PAPERS_CONTENT}}
        </main>

        <!-- モーダル -->
        <div class="modal-overlay" id="modal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3 id="modal-title"></h3>
                    <button class="modal-close" id="modal-close">×</button>
                </div>
                <div class="modal-content">
                    <div class="modal-meta">
                        <p><strong>著者:</strong> <span id="modal-authors"></span></p>
                        <p><strong>ジャーナル:</strong> <span id="modal-journal"></span></p>
                        <p><strong>公開日:</strong> <span id="modal-date"></span></p>
                    </div>
                    <div class="modal-abstract">
                        <h4>要約</h4>
                        <p id="modal-abstract-text"></p>
                    </div>
                    <div class="modal-translation" id="modal-translation-section">
                        <h4>日本語翻訳</h4>
                        <p id="modal-translation-text"></p>
                    </div>
                    <div class="modal-actions">
                        <a id="modal-paper-link" href="#" target="_blank" class="btn btn-primary">論文を開く</a>
                        <a href="#" class="btn btn-secondary">Xで共有</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>`;
    }
}

// メインアプリケーションクラス
class PaperCatcher {
    constructor() {
        this.translator = new GeminiTranslator();
        this.htmlGenerator = new HTMLGenerator();
        this.clients = {
            arxiv: new ArxivClient(),
            semanticScholar: new SemanticScholarClient(),
        };

        // オプショナルクライアント（APIキーが設定されている場合のみ）
        try {
            if (process.env.SPRINGER_API_KEY) {
                this.clients.springer = new SpringerClient();
            }
        } catch (error) {
            console.warn('Springer client not initialized:', error.message);
        }

        try {
            if (process.env.PUBMED_API_KEY) {
                this.clients.pubmed = new PubMedClient();
            }
        } catch (error) {
            console.warn('PubMed client not initialized:', error.message);
        }

        this.clients.crossref = new CrossRefClient();
    }

    async collectPapers(maxResults = 10) {
        console.log('Starting paper collection...');
        const allPapers = [];

        for (const [clientName, client] of Object.entries(this.clients)) {
            try {
                console.log(`Fetching papers from ${clientName}...`);
                let papers = [];

                switch (clientName) {
                    case 'arxiv':
                        papers = await client.fetchArxivPapers(maxResults);
                        break;
                    case 'springer':
                        papers = await client.fetchSpringerPapers(maxResults);
                        break;
                    case 'semanticScholar':
                        papers = await client.fetchSemanticScholarPapers(maxResults);
                        break;
                    case 'pubmed':
                        papers = await client.fetchPubMedPapers(maxResults);
                        break;
                    case 'crossref':
                        papers = await client.fetchCrossRefPapers(null, maxResults);
                        break;
                }

                console.log(`Collected ${papers.length} papers from ${clientName}`);
                allPapers.push(...papers);

                // API制限を避けるための待機
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error collecting papers from ${clientName}:`, error);
            }
        }

        console.log(`Total papers collected: ${allPapers.length}`);
        return this.removeDuplicates(allPapers);
    }

    removeDuplicates(papers) {
        const seen = new Set();
        const uniquePapers = [];

        for (const paper of papers) {
            // Handle cases where title might be an object or undefined
            let titleText = '';
            if (typeof paper.title === 'string') {
                titleText = paper.title;
            } else if (paper.title && typeof paper.title === 'object') {
                titleText = paper.title._ || paper.title.toString() || '';
            } else {
                titleText = 'No title available';
            }

            const key = titleText.toLowerCase().trim();
            if (!seen.has(key)) {
                seen.add(key);
                // Normalize the title and abstract in the paper object
                paper.title = titleText;

                // Also normalize abstract if it's an object
                if (paper.abstract && typeof paper.abstract === 'object') {
                    paper.abstract = paper.abstract._ || paper.abstract.toString() || 'No abstract available';
                } else if (!paper.abstract) {
                    paper.abstract = 'No abstract available';
                }

                uniquePapers.push(paper);
            }
        }

        console.log(`Removed duplicates: ${papers.length} -> ${uniquePapers.length}`);
        return uniquePapers;
    }

    async translatePapers(papers) {
        if (!this.translator.translationEnabled) {
            console.log(`Translation disabled. Skipping translation of ${papers.length} papers...`);
            return papers.map(paper => ({
                ...paper,
                translatedTitle: paper.title,
                translatedAbstract: paper.abstract
            }));
        }

        console.log(`Starting translation of ${papers.length} papers...`);
        const translatedPapers = [];

        for (let i = 0; i < papers.length; i++) {
            try {
                console.log(`Translating paper ${i + 1}/${papers.length}`);
                const translatedPaper = await this.translator.translatePaper(papers[i]);
                translatedPapers.push(translatedPaper);

                // 翻訳API制限を避けるための待機
                if (this.translator.translationEnabled) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`Error translating paper ${i + 1}:`, error);
                translatedPapers.push(papers[i]); // 翻訳失敗時は元の論文を追加
            }
        }

        console.log(`Translation completed: ${translatedPapers.length} papers`);
        return translatedPapers;
    }

    async generateHTMLFiles(papers) {
        console.log('Generating HTML files...');
        const files = [];

        try {
            // メインのindex.htmlを生成
            const indexFile = await this.htmlGenerator.generateHTML(papers, 'index.html');
            files.push(indexFile);

            // 日付順でソートしたアーカイブページを生成
            const sortedByDate = [...papers].sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
            const archiveFile = await this.htmlGenerator.generateHTML(sortedByDate, 'archive.html');
            files.push(archiveFile);

            // ジャーナル別ページを生成
            const sortedByJournal = [...papers].sort((a, b) => a.journal.localeCompare(b.journal));
            const journalFile = await this.htmlGenerator.generateHTML(sortedByJournal, 'journal.html');
            files.push(journalFile);

            // 取得順ページを生成
            const acquisitionFile = await this.htmlGenerator.generateHTML(papers, 'acquisition.html');
            files.push(acquisitionFile);

            // 出版日順ページを生成
            const sortedByPublication = [...papers].sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
            const publicationFile = await this.htmlGenerator.generateHTML(sortedByPublication, 'publication.html');
            files.push(publicationFile);

            // 登録日順ページを生成（現在の日付を登録日として使用）
            const currentDate = new Date().toISOString();
            const papersWithRegistrationDate = papers.map(paper => ({
                ...paper,
                registrationDate: currentDate
            }));
            const registrationFile = await this.htmlGenerator.generateHTML(papersWithRegistrationDate, 'registration.html');
            files.push(registrationFile);

            console.log(`Generated ${files.length} HTML files: ${files.join(', ')}`);
            return files;
        } catch (error) {
            console.error('Error generating HTML files:', error);
            throw error;
        }
    }

    async run() {
        try {
            console.log('=== Paper Catcher Started ===');
            console.log(`Keywords: ${getKeywordsQuery()}`);
            console.log(`Timestamp: ${new Date().toISOString()}`);
            console.log(`Translation enabled: ${this.translator.translationEnabled}`);
            console.log(`Environment variables check:`);
            console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set' : 'Not set'}`);
            console.log(`- KEYWORD1: ${process.env.KEYWORD1 || 'Not set'}`);
            console.log(`- KEYWORD2: ${process.env.KEYWORD2 || 'Not set'}`);

            // 1. 論文収集
            const papers = await this.collectPapers(10); // 各ソースから10件ずつ収集
            if (papers.length === 0) {
                console.log('No papers collected. Exiting...');
                return;
            }

            // 2. 論文翻訳
            const translatedPapers = await this.translatePapers(papers);

            // 3. HTMLファイル生成
            const generatedFiles = await this.generateHTMLFiles(translatedPapers);

            console.log('=== Paper Catcher Completed Successfully ===');
            console.log(`Processed ${translatedPapers.length} papers`);
            console.log(`Generated files: ${generatedFiles.join(', ')}`);

        } catch (error) {
            console.error('=== Paper Catcher Failed ===');
            console.error('Error:', error);
            throw error;
        }
    }
}

// メイン実行部分
async function main() {
    try {
        console.log('=== Paper Catcher Starting ===');
        console.log('Environment Variables Check:');

        // 環境変数とフォールバック値の両方をチェック
        const geminiKey = getEnvWithFallback('GEMINI_API_KEY');
        const keyword1 = getKeywordWithEnvPriority('KEYWORD1', 'machinelearning');
        const keyword2 = getKeywordWithEnvPriority('KEYWORD2', '');
        const springerKey = getEnvWithFallback('SPRINGER_API_KEY');
        const pubmedKey = getEnvWithFallback('PUBMED_API_KEY');

        console.log(`GEMINI_API_KEY: ${geminiKey ? `${geminiKey.substring(0, 10)}... (length: ${geminiKey.length})` : 'NOT SET'}`);
        console.log(`KEYWORD1: ${keyword1}`);
        console.log(`KEYWORD2: ${keyword2 || 'NOT SET'}`);
        console.log(`SPRINGER_API_KEY: ${springerKey ? `${springerKey.substring(0, 10)}...` : 'NOT SET'}`);
        console.log(`PUBMED_API_KEY: ${pubmedKey ? `${pubmedKey.substring(0, 10)}...` : 'NOT SET'}`);
        console.log('================================');

        const paperCatcher = new PaperCatcher();
        await paperCatcher.run();
    } catch (error) {
        console.error('Application failed:', error);
        process.exit(1);
    }
}

// スクリプトが直接実行された場合のみmain関数を実行
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
