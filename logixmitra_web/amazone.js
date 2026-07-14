async function getAccessToken() {
  try {
    const response = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: "Atzr|IwEBINBnd2mnrUNzRxbFhel2x0htsseLHSrJgOkPdGoIApoA0lB7NCwUi0UA2pkSJAKDzA4-jYbKIgfH8Xonk_qCvTVX1PHjvRnEZmg8l7Bs9NNLz_Y9RSu-j4VVQDYtia3bcvGyrmdDyBd7-Aqihpe4SjzZLLit9yTpjO8aJeM4CnVpiEQL04I-sA8gf7zzwF3gsaswCdVVh54q7Jlhz5Os8JgmTbdn1p8du-HrDSPiC40iT6v4lVw4inrMk1o8gSvFIsBQStZ9xgK6z6c5AAgMirvzlgrrZmQbl8gxZ-k7-iycE39mM7b2s8_6_KqDiYEMiDc",
        client_id: "amzn1.application-oa2-client.0e6914603ace4cad9ea31d6f721709c2",
        client_secret: "amzn1.oa2-cs.v1.b4eb9162073fb9a8b0a05d1516f0551cf056f2fa05771a78e81b815961ddc3ff"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    return data.access_token;

  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function getIndiaShippingRates() {
  try {
    const accessToken = await getAccessToken();
    
    // Endpoint for India (Far East Region)
    const url = 'https://sandbox.sellingpartnerapi-fe.amazon.com/shipping/v2/shipments/rates';

    const payload = {
      shipFrom: {
        name: "Sender Name",
        addressLine1: "123, MG Road",
        city: "Bengaluru",
        stateOrRegion: "Karnataka",
        postalCode: "560001",
        countryCode: "IN",
        phoneNumber: "9876543210"
      },
      shipTo: {
        name: "Receiver Name",
        addressLine1: "Plot 45, Hitech City",
        city: "Hyderabad",
        stateOrRegion: "Telangana",
        postalCode: "500081",
        countryCode: "IN"
      },
      packages: [{
        dimensions: {
          length: 15,
          width: 10,
          height: 5,
          unit: "CENTIMETER" // Metric for India
        },
        weight: {
          unit: "KILOGRAM", // Metric for India
          value: 0.5
        },
        packageClientReferenceId: "PKG_ID_001"
      }],
      channelDetails: {
        channelType: "EXTERNAL" // Set to "AMAZON" for marketplace orders
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-amz-access-token': accessToken,
        'x-amzn-shipping-business-id': 'AmazonShipping_IN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('API Error:', result.errors);
      return;
    }

    // Success: Log the rates found
    console.log('Available Rates for India:');
    result.payload.rates.forEach(rate => {
      console.log(`Service: ${rate.serviceName} | Cost: ${rate.totalCharge.value} ${rate.totalCharge.unit}`);
    });

  } catch (error) {
    console.error('Fetch operation failed:', error);
  }
}

getIndiaShippingRates()