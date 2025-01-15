// src/templates.ts
export const instagramPostTemplate = `
# Context
{{recentMessages}}

# Topics
{{topics}}

# Post Directions
{{postDirections}}

# Recent interactions from {{agentName}}:
{{recentPostInteractions}}

# Task
Generate an Instagram post that:
1. Relates to the recent conversation or requested topic
2. Matches the character's style and voice
3. Is engaging and authentic
4. Has a caption under 2200 characters
5. Speaks from the perspective of {{agentName}}
6. Includes appropriate hashtags if relevant

Important: Generate ONLY the following JSON format:
{
  "imageUrl": "URL of the image",
  "caption": "Your caption text"
}`;