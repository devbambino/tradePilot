import {
    Plugin
} from "@elizaos/core";
import { PerplexicaSearchService } from "./search_service";

export const PerplexicaSearchPlugin: Plugin = {
    name: "perplexicaSearch",
    description: "Search the web with Perplexica search engine",
    services: [new PerplexicaSearchService()],
};

export default PerplexicaSearchPlugin;
