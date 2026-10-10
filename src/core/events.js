// Minimaler Event-Bus
const handlers = {};

export const bus = {
  on(evt, fn) { (handlers[evt] ||= []).push(fn); },
  emit(evt, data) { (handlers[evt] || []).forEach((fn) => fn(data)); },
};
