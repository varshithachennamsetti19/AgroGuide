import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingBubble from './LoadingBubble';

describe('LoadingBubble Component', () => {
  it('renders typing indicator bubble with correct accessibility labels', () => {
    render(<LoadingBubble />);
    
    // Check if the typing bubble is in the DOM
    const bubbleElement = screen.getByLabelText('AI is thinking');
    expect(bubbleElement).toBeInTheDocument();
    expect(bubbleElement).toHaveClass('loading-bubble');
    
    // Check if there are 3 dots
    const dots = bubbleElement.getElementsByClassName('dot');
    expect(dots.length).toBe(3);
  });
});
