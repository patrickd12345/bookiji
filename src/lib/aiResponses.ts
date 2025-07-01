import { ollamaService, BOOKIJI_PROMPTS } from '../../lib/ollama';

export const generateAIResponse = async (input: string): Promise<string> => {
  try {
    const prompt = BOOKIJI_PROMPTS.bookingQuery(input);
    const response = await ollamaService.generate(prompt);
    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'I apologize, but I am having trouble processing your request right now. Please try again in a moment.';
  }
}; 