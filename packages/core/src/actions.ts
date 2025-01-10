import { names, uniqueNamesGenerator } from "unique-names-generator";
import { Action, ActionExample } from "./types.ts";

/**
 * Composes a set of example conversations based on provided actions and a specified count.
 * It randomly selects examples from the provided actions and formats them with generated names.
 * @param actionsData - An array of `Action` objects from which to draw examples.
 * @param count - The number of examples to generate.
 * @returns A string containing formatted examples of conversations.
 */
export const composeActionExamples = (actionsData: Action[], count: number) => {
    if (!actionsData.length) return '';

    const data: ActionExample[][][] = actionsData.map(({ examples }) => [...examples]);

    const actionExamples: ActionExample[][] = [];
    let length = data.length;

    for (let i = 0; i < count && length; i++) {
        const actionId = i % length;
        const examples = data[actionId];

        if (examples?.length) {
            const [example] = examples.splice(Math.floor(Math.random() * examples.length), 1);
            actionExamples[i] = example;
        } else {
            i--;
        }

        if (!examples.length) {
            data.splice(actionId, 1);
            length--;
        }
    }

    const formattedExamples = actionExamples.map((example) => {
        const exampleNames = Array.from(
            { length: 5 },
            () => uniqueNamesGenerator({ dictionaries: [names] })
        );

        return example
            .map(({ user, content: { text, action } }) => {
                const actionText = action ? ` (${action})` : '';
                let messageString = `${user}: ${text}${actionText}`;

                exampleNames.forEach((name, index) => {
                    messageString = messageString.replaceAll(`{{user${index + 1}}}`, name);
                });
                return messageString;
            })
            .join('\n');
    });

    return formattedExamples.length ? `\n${formattedExamples.join('\n')}` : '';
};

/**
 * Formats the names of the provided actions into a comma-separated string.
 * @param actions - An array of `Action` objects from which to extract names.
 * @returns A comma-separated string of action names.
 */
export const formatActionNames = (actions: Action[]): string =>
    actions
        .sort(() => 0.5 - Math.random())
        .map(({ name }) => name)
        .join(", ");

/**
 * Formats the provided actions into a detailed string listing each action's name and description, separated by commas and newlines.
 * @param actions - An array of `Action` objects to format.
 * @returns A detailed string of actions, including names and descriptions.
 */
export const formatActions = (actions: Action[]): string =>
    actions
        .sort(() => 0.5 - Math.random())
        .map(({ name, description }) => `${name}: ${description}`)
        .join(",\n");
