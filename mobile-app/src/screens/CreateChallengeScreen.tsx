import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import { enGB, registerTranslation } from "react-native-paper-dates";
import {
  CreateChallengeArgs,
  useSolfitProgram,
} from "../components/solfit/solfit-data-access";
registerTranslation("en-GB", enGB);

type FormErrors = {
  name?: string;
  duration?: string;
  amount?: string;
  steps?: string;
  startTime?: string;
};

export default function BlankScreen() {
  const [name, setName] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [steps, setSteps] = useState<string>("");
  const [startTime, setStartTime] = useState<Date>(
    new Date(Date.now() + 200000000),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<CreateChallengeArgs | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  const { createChallenge } = useSolfitProgram();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!duration.trim()) {
      newErrors.duration = "Duration is required";
    } else if (!/^\d+$/.test(duration)) {
      newErrors.duration = "Duration must be an integer";
    }

    if (!amount.trim()) {
      newErrors.amount = "Amount is required";
    } else if (!/^\d+(\.\d+)?$/.test(amount)) {
      newErrors.amount = "Amount must be a number";
    }

    if (!steps.trim()) {
      newErrors.steps = "Steps is required";
    } else if (!/^\d+$/.test(steps)) {
      newErrors.steps = "Steps must be an integer";
    }

    if (!startTime) {
      newErrors.startTime = "Start time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onDismissSingle = () => {
    setShowDatePicker(false);
  };

  const onConfirmSingle = (date: Date) => {
    setShowDatePicker(false);
    const newDate = new Date(startTime);
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    setStartTime(newDate);
    setShowTimePicker(true);
  };

  const onDismissTime = () => {
    setShowTimePicker(false);
  };

  const onConfirmTime = ({
    hours,
    minutes,
  }: {
    hours: number;
    minutes: number;
  }) => {
    setShowTimePicker(false);
    const newDate = new Date(startTime);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setStartTime(newDate);
  };

  const handleSubmit = (): void => {
    if (validateForm()) {
      const formattedData: CreateChallengeArgs = {
        name,
        duration: duration,
        amount: amount,
        steps: steps,
        startTime: `${parseInt((startTime.getTime() / 1000).toString())}`,
      };

      setFormData(formattedData);

      createChallenge.mutate(formattedData, {
        onSuccess: () => {
          console.log("success");
        },
      });
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <TextInput
          label="Challenge Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          error={!!errors.name}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <TextInput
          label="Duration (days)"
          value={duration}
          onChangeText={setDuration}
          mode="outlined"
          style={styles.input}
          keyboardType="numeric"
          error={!!errors.duration}
        />
        {errors.duration && (
          <Text style={styles.errorText}>{errors.duration}</Text>
        )}

        <TextInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          error={!!errors.amount}
        />
        {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

        <TextInput
          label="Steps"
          value={steps}
          onChangeText={setSteps}
          mode="outlined"
          style={styles.input}
          keyboardType="numeric"
          error={!!errors.steps}
        />
        {errors.steps && <Text style={styles.errorText}>{errors.steps}</Text>}

        <View style={styles.dateContainer}>
          <TextInput
            label="Start Date and Time"
            value={startTime.toLocaleString()}
            mode="outlined"
            style={[styles.input]}
            editable={false}
            right={
              <TextInput.Icon
                icon="calendar"
                onPress={() => setShowDatePicker(true)}
              />
            }
            error={!!errors.startTime}
          />
        </View>
        {errors.startTime && (
          <Text style={styles.errorText}>{errors.startTime}</Text>
        )}

        <Button mode="contained-tonal" onPress={handleSubmit}>
          Create Challenge
        </Button>
      </ScrollView>

      <DatePickerModal
        locale="en-GB"
        mode="single"
        visible={showDatePicker}
        onDismiss={onDismissSingle}
        date={startTime}
        onConfirm={({ date }) => {
          onConfirmSingle(date as Date);
        }}
        animationType="slide"
        presentationStyle="pageSheet"
      />

      <TimePickerModal
        visible={showTimePicker}
        onDismiss={onDismissTime}
        onConfirm={onConfirmTime}
        hours={startTime.getHours()}
        minutes={startTime.getMinutes()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 10,
    marginTop: -5,
    fontSize: 12,
  },
  dateContainer: {
    marginVertical: 10,
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
});
