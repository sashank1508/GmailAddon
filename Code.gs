// Function to create the add-on interface
function buildAddOnCard() {
  Logger.log("buildAddOnCard triggered");

  // Create the header
  var cardHeader = CardService.newCardHeader()
      .setTitle("Enrich Email")
      .setSubtitle("Input email and get enriched data from Apollo");

  // Create the email input field
  var emailInput = CardService.newTextInput()
      .setFieldName("email")
      .setTitle("Enter Email Address")
      .setHint("E.g. john.doe@example.com");

  // Create the fetch button
  var fetchButton = CardService.newTextButton()
      .setText("Fetch Data")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName("fetchDataAndDisplay"));

  // Create the section and add widgets
  var cardSection = CardService.newCardSection()
      .addWidget(emailInput)
      .addWidget(fetchButton);

  // Build the card
  return CardService.newCardBuilder()
      .setHeader(cardHeader)
      .addSection(cardSection)
      .build();
}

// Function to fetch data and display it with further options
function fetchDataAndDisplay(e) {
  Logger.log("fetchDataAndDisplay triggered");
  
  try {
    var email = extractEmailFromEvent(e);

    if (!validateEmail(email)) {
      return sendNotification("Invalid email format. Please enter a valid email.", "ERROR");
    }

    var apolloData = fetchLeadDetails(email);

    if (apolloData) {
      Logger.log("Apollo Data received: " + JSON.stringify(apolloData));
      
      // Check if key details like 'name' are missing or 'N/A'
      if (apolloData.name === 'N/A' || !apolloData.name) {
        return sendNotification("No relevant data found for the provided email.", "WARNING");
      }

      // Display the fetched data and show options to create a draft or send email
      return displayDataWithOptions(apolloData);
    } else {
      // No data found in API, prompt for manual input
      return sendNotification("No data found for the provided email. Please enter the details manually.", "WARNING")
          .setNavigation(CardService.newNavigation().pushCard(buildManualInputCard(email)))
          .build();
    }
  } catch (error) {
    Logger.log(`Error in fetchDataAndDisplay: ${error.message}`);
    return sendNotification("An error occurred while processing your request. Please try again.", "ERROR");
  }
}

// Function to extract website from email
function extractWebsite(email) {
  if (email && email.includes('@')) {
    const domain = email.split('@')[1];
    return `www.${domain}`;
  }
  return 'N/A';
}

// Function to display the fetched data and provide options to create draft or send email
function displayDataWithOptions(apolloData) {
  Logger.log("Displaying data with further options");

  var cardHeader = CardService.newCardHeader()
      .setTitle(`${apolloData.name} Details`)
      .setSubtitle("From Apollo People Enrichment API");

  var resultSection = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(`<b>Name:</b> ${apolloData.name || 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>Company:</b> ${apolloData.organization ? apolloData.organization.name : 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>Website:</b> ${apolloData.email ? extractWebsite(apolloData.email) : 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>Job Title:</b> ${apolloData.title || 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>Email:</b> ${apolloData.email || 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>LinkedIn:</b> ${apolloData.linkedin_url || 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>Address:</b> ${apolloData.organization ? `${apolloData.organization.city || 'N/A'}, ${apolloData.organization.state || 'N/A'}, ${apolloData.organization.country || 'N/A'}` : 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>Employee Count:</b> ${apolloData.organization ? apolloData.organization.estimated_num_employees || 'N/A' : 'N/A'}`))
      .addWidget(CardService.newTextParagraph().setText(`<b>Phone Number:</b> ${apolloData.organization ? apolloData.organization.phone || 'N/A' : 'N/A'}`));
      
  // Create a ButtonSet to place buttons side by side
  var buttonSet = CardService.newButtonSet();

  // Add buttons to the ButtonSet
  var createDraftButton = CardService.newTextButton()
      .setText("Create Draft")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName("createDraftWithDisplayedData").setParameters({apolloData: JSON.stringify(apolloData)}));
  
  var sendEmailButton = CardService.newTextButton()
      .setText("Send Email")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName("promptForRecipientEmail").setParameters({apolloData: JSON.stringify(apolloData)}));

  // Add both buttons to the button set
  buttonSet.addButton(createDraftButton)
           .addButton(sendEmailButton);

  // Add button set to the section
  resultSection.addWidget(buttonSet);

  // Build and return the card with fetched data and buttons
  return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Lead information fetched successfully!"))
      .setNavigation(CardService.newNavigation().pushCard(
        CardService.newCardBuilder()
          .setHeader(cardHeader)
          .addSection(resultSection)
          .build()
      ))
      .build();
}

// Function to create a draft with the displayed data
function createDraftWithDisplayedData(e) {
  Logger.log("Creating draft with displayed data");

  var apolloData = JSON.parse(e.parameters.apolloData);

  var enrichedHtmlContent = formatEnrichedData(apolloData);

  GmailApp.createDraft("username@example.com", `Enriched Information for ${apolloData.email}`, '', {
    htmlBody: enrichedHtmlContent
  });

  return sendNotification("Draft created successfully!");
}

// Function to prompt the user to input recipient email for sending email
function promptForRecipientEmail(e) {
  Logger.log("Prompting for recipient email");

  var apolloData = JSON.parse(e.parameters.apolloData);

  var cardHeader = CardService.newCardHeader()
      .setTitle("Send Email")
      .setSubtitle("Input the recipient's email");

  var recipientEmailInput = CardService.newTextInput()
      .setFieldName("recipientEmail")
      .setTitle("Recipient Email")
      .setHint("E.g. sashank1.y@gmail.com");

  var sendEmailButton = CardService.newTextButton()
      .setText("Send Email")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName("sendEmailWithDisplayedData").setParameters({
        apolloData: JSON.stringify(apolloData),
        recipientEmailField: "recipientEmail"
      }));

  var emailSection = CardService.newCardSection()
      .addWidget(recipientEmailInput)
      .addWidget(sendEmailButton);

  return CardService.newNavigation().pushCard(
    CardService.newCardBuilder()
      .setHeader(cardHeader)
      .addSection(emailSection)
      .build()
  );
}

// Function to send the email with the displayed data
function sendEmailWithDisplayedData(e) {
  Logger.log("Sending email with displayed data");

  var recipientEmail = getFieldValue(e, 'recipientEmail');
  var apolloData = JSON.parse(e.parameters.apolloData);

  if (!validateEmail(recipientEmail)) {
    return sendNotification("Invalid recipient email format. Please enter a valid email.", "ERROR");
  }

  var enrichedHtmlContent = formatEnrichedData(apolloData);

  GmailApp.sendEmail(recipientEmail, `Enriched Information for ${apolloData.email}`, '', {
    htmlBody: enrichedHtmlContent
  });

  return sendNotification("Email sent successfully!");
}

// Utility function to extract email from the event
function extractEmailFromEvent(e) {
  if (e && e.commonEventObject && e.commonEventObject.formInputs && e.commonEventObject.formInputs.email && e.commonEventObject.formInputs.email.stringInputs) {
    return e.commonEventObject.formInputs.email.stringInputs.value[0];
  }
  // For testing purposes, return a default email if the event object is missing
  Logger.log("Event object not found, using default email for testing");
  return "test@example.com";  // Replace with any valid email for testing
}

// Email validation function
function validateEmail(email) {
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Utility function to fetch input field values safely
function getFieldValue(e, fieldName) {
  return e.commonEventObject.formInputs[fieldName]?.stringInputs?.value[0] || "N/A";
}

// Function to fetch lead details from Apollo API
function fetchLeadDetails(email) {
  var apiUrl = 'https://api.apollo.io/v1/people/match';
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'X-Api-Key': 'GwrHhSPCenHEzZ4mEE-UfA'
    },
    'payload': JSON.stringify({ email: email }),
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(apiUrl, options);
    var data = JSON.parse(response.getContentText());
    if (data && data.person) {
      Logger.log(`Lead details found: ${JSON.stringify(data.person)}`);
      return data.person;
    } else {
      Logger.log(`No lead details found for email: ${email}`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error fetching lead details: ${error.message}`);
    return null;
  }
}

// Function to format enriched data into HTML
function formatEnrichedData(apolloData) {
  const organization = apolloData.organization || {};
  const name = apolloData.name || 'N/A';
  const title = apolloData.title || 'N/A';
  const email = apolloData.email || 'N/A';
  const linkedin_url = apolloData.linkedin_url || '#';
  const city = organization.city || 'N/A';
  const state = organization.state || 'N/A';
  const country = organization.country || 'N/A';
  const address = `${city}, ${state}, ${country}`;
  const employeeCount = organization.estimated_num_employees || 'N/A';
  const phone = organization.phone || 'N/A';

  const emailParts = email.split('@');
  const domain = emailParts.length > 1 ? 'www.' + emailParts[1] : 'N/A';

  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://mma.prnewswire.com/media/2153232/Apollo_logotype_OnWhite_Logo.jpg?p=facebook" alt="Apollo Logo" style="max-width: 150px;">
          </div>
          <h3 style="color: #000000; text-align: center; margin-bottom: 30px; font-size: 14px;">
            Enriched Data From Apollo People Enrichment API<br>
          </h3>
          <ul style="list-style-type: none; padding: 0;">
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>Name:&nbsp;</strong> <span>${name}</span>
            </li>
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>Company:&nbsp;</strong> <span>${organization.name || 'N/A'}, ${domain}</span>
            </li>
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>Job Title:&nbsp;</strong> <span>${title}</span>
            </li>
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>Email:&nbsp;</strong> <span>${email}</span>
            </li>
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>LinkedIn:&nbsp;</strong> <a href="${linkedin_url}" style="color: #4285F4; text-decoration: none;">${linkedin_url}</a>
            </li>
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>Address:&nbsp;</strong> <span>${address}</span>
            </li>
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>Employee Count:&nbsp;</strong> <span>${employeeCount}</span>
            </li>
            <li style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
              <strong>Company Phone:&nbsp;</strong> <span>${phone}</span>
            </li>
          </ul>
          <p style="margin-top: 20px;">
            Best,<br>
            Apollo.io
          </p>
        </div>
      </body>
    </html>
  `;
}

// Utility function to send notification
function sendNotification(message, type = "INFO") {
  var notification = CardService.newNotification().setText(message);
  if (type === "ERROR") notification.setType(CardService.NotificationType.ERROR);
  else if (type === "WARNING") notification.setType(CardService.NotificationType.WARNING);
  return CardService.newActionResponseBuilder().setNotification(notification).build();
}

// Test function to run the code with a mock event object in Apps Script editor
function testFetchDataAndDisplay() {
  var mockEvent = {
    commonEventObject: {
      formInputs: {
        email: {
          stringInputs: {
            value: ["john.doe@example.com"]
          }
        }
      }
    }
  };
  
  // Now call the main function with the mock event object
  fetchDataAndDisplay(mockEvent);
}
