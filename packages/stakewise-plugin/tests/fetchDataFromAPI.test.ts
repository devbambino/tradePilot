jest.mock("@ai16z/eliza", () => ({
    elizaLogger: {
      log: jest.fn(),
      error: jest.fn(),
    },
  }));
  

  import { fetchDataFromAPI } from "../src/actions/fetchVaultData";
  import axios from "axios";
  
  jest.mock("axios");
  
  describe("fetchDataFromAPI", () => {
      it("should return valid data from the API", async () => {
          const mockResponse = { data: { key: "value" } };
          (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);
  
          const query = "{ testQuery }";
          const result = await fetchDataFromAPI(query);
  
          expect(result).toEqual(mockResponse.data); // Fix: Compare with `mockResponse.data`
          expect(axios.post).toHaveBeenCalledWith(
              "https://graphs.stakewise.io/mainnet/subgraphs/name/stakewise/prod",
              { query },
              { headers: { "Content-Type": "application/json" } }
          );
      });
  
      it("should throw an error when the API call fails", async () => {
          (axios.post as jest.Mock).mockRejectedValueOnce(new Error("API error"));
  
          const query = "{ testQuery }";
  
          await expect(fetchDataFromAPI(query)).rejects.toThrow("Failed to fetch data from the API.");
      });
  });
  