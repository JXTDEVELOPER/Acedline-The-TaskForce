import { FormField } from "../types";

/**
 * Creates a brand new Google Form on the user's Google Drive.
 * Google Forms API v1 restricts the initial POST body to only set 'info.title'.
 */
export async function createGoogleForm(
  accessToken: string,
  title: string
): Promise<{ formId: string; responderUri: string }> {
  const response = await fetch("https://forms.googleapis.com/v1/forms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      info: {
        title: title || "Event Registration",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Forms creation error details:", errorText);
    throw new Error(`Failed to create Google Form: ${response.statusText}. details: ${errorText}`);
  }

  const data = await response.json();
  if (!data.formId || !data.responderUri) {
    throw new Error("Missing form identifiers from Google Forms API response");
  }

  return {
    formId: data.formId,
    responderUri: data.responderUri,
  };
}

/**
 * Executes a batchUpdate on Google Forms API to populate all items/fields.
 */
export async function syncGoogleFormFields(
  accessToken: string,
  formId: string,
  fields: FormField[],
  description?: string
): Promise<void> {
  const requests: any[] = [];

  // Update description if one is provided
  if (description) {
    requests.push({
      updateFormInfo: {
        info: {
          description: description,
        },
        updateMask: "description",
      },
    });
  }

  const contentRequests = fields.map((field, idx) => {
    const question: any = {
      required: !!field.required,
    };

    if (field.type === "text" || field.type === "email") {
      question.textQuestion = {
        paragraph: field.label.toLowerCase().includes("detail") || field.label.toLowerCase().includes("describe"),
      };
    } else if (field.type === "select") {
      question.choiceQuestion = {
        type: "DROP_DOWN",
        options: (field.options || []).map((opt) => ({ value: opt })),
      };
    } else if (field.type === "checkbox") {
      question.choiceQuestion = {
        type: "CHECKBOX",
        options: [{ value: field.placeholder || "I agree / I confirm" }],
      };
    } else {
      // safe fallback
      question.textQuestion = { paragraph: false };
    }

    const item = {
      title: field.label,
      description: field.placeholder || "",
      questionItem: {
        question,
      },
    };

    return {
      createItem: {
        item,
        location: {
          index: idx,
        },
      },
    };
  });

  requests.push(...contentRequests);

  const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Forms BatchUpdate error details:", errorText);
    throw new Error(`Failed to populate Google Form elements: ${response.statusText}`);
  }
}

/**
 * Fetches Google Form items (to match questionId to titles) and response structures.
 */
export async function fetchGoogleFormResponses(
  accessToken: string,
  formId: string
): Promise<{
  questions: { id: string; title: string }[];
  responses: {
    responseId: string;
    submittedAt: string;
    answers: Record<string, string>;
  }[];
}> {
  // 1. Fetch Form schema detail
  const formRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!formRes.ok) {
    const errorText = await formRes.text();
    console.error("Fetch Google Form Schema Error:", errorText);
    throw new Error(`Failed to retrieve Form fields setup: ${formRes.statusText}`);
  }

  const formData = await formRes.json();
  const items = formData.items || [];

  const questionMap: Record<string, string> = {};
  const questionsList: { id: string; title: string }[] = [];

  items.forEach((item: any) => {
    if (item.questionItem?.question) {
      const qId = item.questionItem.question.questionId;
      const title = item.title || "Untitled Question";
      questionMap[qId] = title;
      questionsList.push({ id: qId, title });
    }
  });

  // 2. Fetch actual responses
  const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!responsesRes.ok) {
    const errorText = await responsesRes.text();
    console.error("Fetch Google Form Responses Error:", errorText);
    // Return empty responses list if form has no responses setup or lists are empty yet
    if (responsesRes.status === 404 || errorText.includes("no responses")) {
      return { questions: questionsList, responses: [] };
    }
    throw new Error(`Failed to retrieve form responses: ${responsesRes.statusText}`);
  }

  const responsesData = await responsesRes.json();
  const rawResponses = responsesData.responses || [];

  const formattedResponses = rawResponses.map((rep: any) => {
    const answersObj: Record<string, string> = {};

    if (rep.answers) {
      Object.keys(rep.answers).forEach((qId) => {
        const title = questionMap[qId] || qId;
        const textAnswers = rep.answers[qId]?.textAnswers?.answers || [];
        const answersList = textAnswers.map((a: any) => a.value || "");
        answersObj[title] = answersList.join(", ");
      });
    }

    return {
      responseId: rep.responseId,
      submittedAt: rep.lastSubmittedTime || rep.createTime || "",
      answers: answersObj,
    };
  });

  return {
    questions: questionsList,
    responses: formattedResponses,
  };
}
