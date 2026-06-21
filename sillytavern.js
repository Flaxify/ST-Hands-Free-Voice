import { eventSource, event_types, sendMessageAsUser } from '../../../../script.js';

export { eventSource, event_types, sendMessageAsUser };

export function getContext() {
    return SillyTavern.getContext();
}
