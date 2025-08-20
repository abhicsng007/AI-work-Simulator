'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Loader2 } from 'lucide-react';

interface ProjectQuestion {
  id: string;
  question: string;
  type: 'select' | 'text' | 'multiselect';
  options?: string[];
}

interface ProjectWizardProps {
  onComplete: (answers: any[]) => void;
  onCancel: () => void;
}

export default function ProjectWizard({ onComplete, onCancel }: ProjectWizardProps) {
  const [questions, setQuestions] = useState<ProjectQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('http://localhost:3001/projects/questions');
      const data = await response.json();
      setQuestions(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      setLoading(false);
    }
  };

  const handleAnswer = (answer: any) => {
    setAnswers({ ...answers, [questions[currentStep].id]: answer });
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete the wizard
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      onComplete(formattedAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[--color-discord-accent]" size={32} />
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const currentAnswer = answers[currentQuestion?.id];

  return (
    <div className="bg-[--color-discord-darker] rounded-lg p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-[--color-discord-accent]" />
            Create Your Project
          </h2>
          <span className="text-[--color-discord-muted]">
            Step {currentStep + 1} of {questions.length}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-[--color-discord-light] rounded-full h-2">
          <div 
            className="bg-[--color-discord-accent] h-2 rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {currentQuestion && (
        <div className="mb-8">
          <h3 className="text-xl text-white mb-6">{currentQuestion.question}</h3>

          {currentQuestion.type === 'select' && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <label
                  key={option}
                  className={`block p-4 rounded-lg cursor-pointer transition-all ${
                    currentAnswer === option
                      ? 'bg-[--color-discord-accent] text-white'
                      : 'bg-[--color-discord-light] hover:bg-[--color-discord-lighter] text-[--color-discord-text]'
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => handleAnswer(e.target.value)}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === 'text' && (
            <textarea
              value={currentAnswer || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full bg-[--color-discord-light] text-white rounded-lg p-4 h-32 focus:outline-none focus:ring-2 focus:ring-[--color-discord-accent]"
              placeholder="Type your answer here..."
            />
          )}

          {currentQuestion.type === 'multiselect' && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => {
                const isSelected = (currentAnswer || []).includes(option);
                return (
                  <label
                    key={option}
                    className={`block p-4 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[--color-discord-accent] text-white'
                        : 'bg-[--color-discord-light] hover:bg-[--color-discord-lighter] text-[--color-discord-text]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={isSelected}
                      onChange={(e) => {
                        const newAnswer = currentAnswer || [];
                        if (e.target.checked) {
                          handleAnswer([...newAnswer, option]);
                        } else {
                          handleAnswer(newAnswer.filter((a: string) => a !== option));
                        }
                      }}
                      className="sr-only"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={currentStep === 0 ? onCancel : handlePrevious}
          className="px-6 py-2 bg-[--color-discord-light] hover:bg-[--color-discord-lighter] text-white rounded-lg flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </button>

        <button
          onClick={handleNext}
          disabled={!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)}
          className="px-6 py-2 bg-[--color-discord-accent] hover:bg-[#4752c4] disabled:bg-[--color-discord-lighter] disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2"
        >
          {currentStep === questions.length - 1 ? 'Generate Project' : 'Next'}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}