import axios from 'axios';

export class FedExRateService {
    constructor() {
        this.baseURL = process.env.FEDEX_BASE_URL || 'https://apis-sandbox.fedex.com';
        this.clientId = process.env.FEDEX_CLIENT_ID;
        this.clientSecret = process.env.FEDEX_CLIENT_SECRET;
        this.accountNumber = process.env.FEDEX_ACCOUNT_NUMBER;
        this.authToken = null;
        this.tokenExpiry = null;
    }

    async getValidToken() {
        if (!this.authToken || Date.now() >= (this.tokenExpiry - 60000)) {
            await this.authenticate();
        }
        return this.authToken;
    }

    async authenticate() {
        try {
            const response = await axios.post(
                `${this.baseURL}/oauth/token`,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.authToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            return this.authToken;
        } catch (error) {
            console.error('FedEx authentication failed:', error.response?.data || error.message);
            throw new Error(`FedEx authentication failed: ${error.message}`);
        }
    }

    /**
     * Get shipping rates
     */
    async getShippingRates(requestedPackageLineItems, destination) {
        try {
            const token = await this.getValidToken();

            const origin = {
                postalCode: process.env.WAREHOUSE_ZIP || '90001',
                countryCode: process.env.WAREHOUSE_COUNTRY || 'US',
                stateOrProvinceCode: process.env.WAREHOUSE_STATE || 'CA',
                city: process.env.WAREHOUSE_CITY || 'Los Angeles',
                streetLines: [process.env.WAREHOUSE_STREET || '123 Shipping St']
            };

            if (!this.accountNumber) {
                throw new Error('FedEx account number is not configured');
            }

            const requestData = {
                accountNumber: {
                    value: this.accountNumber
                },
                requestedShipment: {
                    shipper: {
                        address: {
                            postalCode: origin.postalCode,
                            countryCode: origin.countryCode,
                            city: origin.city,
                            stateOrProvinceCode: origin.stateOrProvinceCode,
                            streetLines: origin.streetLines
                        }
                    },
                    recipient: {
                        address: {
                            postalCode: destination.postalCode,
                            countryCode: destination.countryCode,
                            city: destination.city || '',
                            stateOrProvinceCode: destination.stateOrProvinceCode || '',
                            streetLines: ['Delivery Address']
                        }
                    },
                    pickupType: "USE_SCHEDULED_PICKUP",
                    rateRequestType: ["LIST", "ACCOUNT"],
                    requestedPackageLineItems: requestedPackageLineItems
                }
            };

            const response = await axios.post(
                `${this.baseURL}/rate/v1/rates/quotes`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-locale': 'en_US'
                    },
                    timeout: 15000
                }
            );

            return this.parseRates(response.data);

        } catch (error) {
            console.error('FedEx API error:', {
                status: error.response?.status,
                message: error.message
            });

            if (error.response?.data?.errors) {
                const fedexError = error.response.data.errors[0];
                throw new Error(`FedEx API Error: ${fedexError.message}`);
            }

            if (error.code === 'ECONNABORTED') {
                throw new Error('FedEx API request timeout');
            }

            throw new Error(`FedEx service error: ${error.message}`);
        }
    }

    parseRates(data) {
        try {
            if (!data.output?.rateReplyDetails) {
                console.warn('No rates found in FedEx response');
                return [];
            }

            const parsedRates = [];

            data.output.rateReplyDetails.forEach(rate => {
                if (!rate.ratedShipmentDetails || rate.ratedShipmentDetails.length === 0) {
                    return;
                }

                // Use ACCOUNT rate if available, otherwise LIST rate
                let bestRateDetail = rate.ratedShipmentDetails.find(r => r.rateType === 'ACCOUNT') ||
                    rate.ratedShipmentDetails.find(r => r.rateType === 'LIST') ||
                    rate.ratedShipmentDetails[0];

                let amount = 0;
                let currency = 'USD';

                // Extract charge amount
                if (bestRateDetail.totalNetCharge !== undefined) {
                    amount = bestRateDetail.totalNetCharge;
                } else if (bestRateDetail.totalNetFedExCharge !== undefined) {
                    amount = bestRateDetail.totalNetFedExCharge;
                }

                // Extract currency
                if (bestRateDetail.currency) {
                    currency = bestRateDetail.currency;
                }

                parsedRates.push({
                    serviceType: rate.serviceType,
                    serviceName: rate.serviceName,
                    totalNetCharge: {
                        amount: typeof amount === 'number' ? parseFloat(amount.toFixed(2)) : 0,
                        currency: currency
                    },
                    deliveryTimestamp: rate.deliveryTimestamp,
                    carrierCode: 'FEDEX',
                    estimatedDelivery: rate.deliveryTimestamp ?
                        new Date(rate.deliveryTimestamp).toISOString() : undefined,
                    rateType: bestRateDetail.rateType
                });
            });

            return parsedRates;

        } catch (error) {
            console.error('Error parsing FedEx rates:', error);
            return [];
        }
    }
}

export const fedexRateService = new FedExRateService();
export default fedexRateService;